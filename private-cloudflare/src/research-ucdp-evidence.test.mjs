import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {officialCsvFromZip,parseOfficialCountryYears,evidenceForCountry,researchUcdpEvidenceResponse} from './research-ucdp-evidence.mjs';

function zipFile(csv) {
  const compressed=deflateRawSync(Buffer.from(csv));
  const filename=Buffer.from('SYNTHETIC.csv');
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);
  local.writeUInt32LE(Buffer.byteLength(csv),22);local.writeUInt16LE(filename.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,6);
  central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);
  central.writeUInt32LE(Buffer.byteLength(csv),24);central.writeUInt16LE(filename.length,28);
  const eocd=Buffer.alloc(22);eocd.writeUInt32LE(0x06054b50,0);
  eocd.writeUInt16LE(1,8);eocd.writeUInt16LE(1,10);
  eocd.writeUInt32LE(46+filename.length,12);eocd.writeUInt32LE(30+filename.length+compressed.length,16);
  return Buffer.concat([local,filename,compressed,central,filename,eocd]);
}
function synthCSV() {
  const rows=['country_id,year,Version,sb_total_deaths_best,sb_dyad_count,sb_dyad_names'];
  for(let cid=1;cid<=199;cid++)for(let year=1989;year<=2024;year++){
    if(cid>167 && year===2024)continue;
    const active=cid===1 && year>=2015 && year<=2017;
    rows.push([cid,year,'26.1',active?37:0,active?1:0,
      active?'"Government of SYNTHETIC - Opposition, group"':'NO_DYAD'].join(','));
  }
  assert.equal(rows.length,7133);
  return rows.join('\r\n')+'\r\n';
}
const source=synthCSV();
const zip=zipFile(source),sha=createHash('sha256').update(zip).digest('hex');

test('ZIP verified by SHA, central directory and decompression (not fabricated from a client outcome)', async()=>{
  const restored=await officialCsvFromZip(zip,sha);
  assert.equal(restored,source);
  await assert.rejects(officialCsvFromZip(zip,'0'.repeat(64)),/CHECKSUM/);
  await assert.rejects(officialCsvFromZip(Buffer.from('not a zip'),sha),/SIZE/);
});

test('UCDP quotes, dyad names and original threshold counts come from source rows',()=>{
  const panel=parseOfficialCountryYears(source);
  assert.equal(panel.size,199);
  const c=panel.get(1);
  assert.equal(c.get(2016).sbDeathsBest,37);
  assert.equal(c.get(2016).sbDyadCount,1);
  assert.equal(c.get(2016).dyadNames[0],'Government of SYNTHETIC - Opposition, group');
  assert.equal(c.get(2018).sbDeathsBest,0);
  assert.equal(c.get(2025),undefined);
  assert.throws(()=>parseOfficialCountryYears(source.replace('26.1','99.9')),/UCDP_DATA_ROW/);
});

test('country responses only reveal verified, explicit historical rows and fail closed',async()=>{
  const loader=async()=>({ok:true,status:200,arrayBuffer:async()=>zip});
  // Actual archive digest is intentionally pinned: synthetic request may NOT be presented as official.
  // The separately exported ZIP reader accepts an explicit fixture digest only for testing.
  await assert.rejects(evidenceForCountry(1,2014,3,loader),/UCDP_ARCHIVE_CHECKSUM/);
  await assert.rejects(evidenceForCountry(1,2025,3,loader),/UCDP_INVALID_EVIDENCE_REQUEST/);
  const unavailable=await researchUcdpEvidenceResponse([],new URLSearchParams('catalog=invalid&country=1'),loader);
  assert.equal(unavailable.status,422);
  assert.equal(unavailable.body.code,'NONCANONICAL_EVIDENCE_SELECTION');
});
