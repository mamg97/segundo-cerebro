"""Private, salted forecast commitment + independently verifiable RFC3161 receipt.

No TSA is contacted automatically. A hash/local timestamp alone is NOT a seal.
The Worker deliberately has no receipt-verifier integration yet and scores none.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import secrets
import subprocess
from pathlib import Path


def utc(value):
    parsed=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
    if parsed.tzinfo is None: raise ValueError('Timezone required')
    return parsed.astimezone(dt.timezone.utc)


def commitment(payload, nonce):
    if len(bytes.fromhex(nonce))<32: raise ValueError('At least 256 bits of salt required')
    raw=json.dumps({'nonce':nonce,'payload':payload},sort_keys=True,separators=(',',':'),allow_nan=False).encode()
    return hashlib.sha256(raw).digest()


def validate_payload(payload):
    required={'id','phenomenon','region','horizon','issuedAt','resolutionAt','asOf',
              'probability','baselineProbability','modelVersion','datasetVersion'}
    if not required.issubset(payload): raise ValueError('Incomplete forecast payload')
    if not utc(payload['asOf'])<=utc(payload['issuedAt'])<utc(payload['resolutionAt']):
        raise ValueError('Invalid information or outcome dates')
    for key in ('probability','baselineProbability'):
        if isinstance(payload[key],bool) or not isinstance(payload[key],(int,float)) or not 0<=payload[key]<=1:
            raise ValueError('Invalid probability')
    if 'outcome' in payload: raise ValueError('Cannot seal a resolved outcome')


def prepare(payload, directory):
    validate_payload(payload)
    if utc(payload['issuedAt'])<=dt.datetime.now(dt.timezone.utc):
        raise ValueError('Prepare before the declared issuance; no backdating')
    directory.mkdir(parents=True,exist_ok=False)
    nonce=secrets.token_hex(32)
    (directory/'payload.json').write_text(json.dumps(payload,sort_keys=True,indent=2)+'\n')
    (directory/'nonce.txt').write_text(nonce+'\n')
    (directory/'commitment.bin').write_bytes(commitment(payload,nonce))
    subprocess.run(['openssl','ts','-query','-data',str(directory/'commitment.bin'),'-sha256','-cert',
                    '-out',str(directory/'request.tsq')],check=True,capture_output=True)
    return directory/'request.tsq'


def verify(directory, receipt, trust_root, chain):
    payload=json.loads((directory/'payload.json').read_text())
    validate_payload(payload)
    expected=commitment(payload,(directory/'nonce.txt').read_text().strip())
    if expected!=(directory/'commitment.bin').read_bytes(): raise ValueError('Payload changed')
    # Verify against DATA, not only a saved query that could have been replaced.
    subprocess.run(['openssl','ts','-verify','-data',str(directory/'commitment.bin'),'-in',str(receipt),
                    '-CAfile',str(trust_root),'-untrusted',str(chain)],check=True,capture_output=True)
    response=subprocess.run(['openssl','ts','-reply','-in',str(receipt),'-text'],check=True,
                            capture_output=True,text=True).stdout
    stamp=re.search(r'^Time stamp:\s*(.+)$',response,re.M)
    if not stamp: raise ValueError('Missing independently signed timestamp')
    # OpenSSL emits an English UTC timestamp, optionally with fractional seconds.
    raw=stamp.group(1)
    pattern='%b %d %H:%M:%S.%f %Y GMT' if re.search(r'\d{2}:\d{2}:\d{2}\.\d+',raw) else '%b %d %H:%M:%S %Y GMT'
    instant=dt.datetime.strptime(raw,pattern).replace(tzinfo=dt.timezone.utc)
    if not instant<=utc(payload['issuedAt']) or not instant<utc(payload['resolutionAt']):
        raise ValueError('Seal was issued too late')
    return {'id':payload['id'],'verified':True,'payloadMatched':True,'independentTimestamp':True,
            'timestamp':instant.isoformat(),'commitmentSha256':expected.hex(),
            'payloadSha256':hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
            'receiptSha256':hashlib.sha256(receipt.read_bytes()).hexdigest(),
            'trustRootSha256':hashlib.sha256(trust_root.read_bytes()).hexdigest()}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('operation',choices=['prepare','verify'])
    p.add_argument('--directory',type=Path,required=True)
    p.add_argument('--payload',type=Path)
    p.add_argument('--receipt',type=Path)
    p.add_argument('--trust-root',type=Path)
    p.add_argument('--chain',type=Path)
    args=p.parse_args()
    if args.operation=='prepare':
        if not args.payload:p.error('--payload required')
        print(prepare(json.loads(args.payload.read_text()),args.directory))
    else:
        if not all([args.receipt,args.trust_root,args.chain]):p.error('receipt, trust root and chain required')
        print(json.dumps(verify(args.directory,args.receipt,args.trust_root,args.chain),indent=2))
