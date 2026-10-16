// Official immutable-by-checksum inputs. No credentials, API token or paid service.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const destination = process.argv[2];
if (!destination) throw new Error('Usage: node download.mjs /private/data-directory');
const protocol = JSON.parse(await readFile(new URL('./protocol.json', import.meta.url), 'utf8'));
await mkdir(resolve(destination), { recursive: true });
const inputs = [
  ['ucdp.zip', protocol.archive_url, protocol.archive_sha256],
  ['codebook.pdf', protocol.codebook_url, protocol.codebook_sha256]
];
const manifest = { datasetVersion: protocol.dataset_version, license: protocol.license, inputs: [] };
for (const [name, url, expected] of inputs) {
  const path = join(resolve(destination), name);
  let bytes;
  try { await access(path); bytes = await readFile(path); }
  catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'follow' });
    if (!response.ok) throw new Error('Download failed: ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== expected) throw new Error('Source changed: ' + name + '; review release before updating protocol');
  await writeFile(path, bytes);
  manifest.inputs.push({ name, url, sha256, bytes: bytes.length });
}
await writeFile(join(resolve(destination), 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Verified ' + manifest.inputs.length + ' official inputs; no data written to source tree.');
