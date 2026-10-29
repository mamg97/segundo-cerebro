import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { verifyGitHubOidc, normalizeSnapshot } from './midas-ingest.js';

const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test', use: 'sig' };
const fetcher = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
const now = Date.now();
const epoch = Math.floor(now / 1000);
const claims = { iss: 'https://token.actions.githubusercontent.com', aud: 'segundo-cerebro-midas-legacy-ingest',
  repository: 'mamg97/midas-paper-lab', repository_id: '1392125585', repository_owner: 'mamg97', repository_owner_id: '110605707',
  sub: 'repo:mamg97@110605707/midas-paper-lab@1392125585:ref:refs/heads/main', ref: 'refs/heads/main',
  workflow_ref: 'mamg97/midas-paper-lab/.github/workflows/genetic_sp500.yml@refs/heads/main',
  event_name: 'schedule', run_id: '123', iat: epoch - 10, nbf: epoch - 10, exp: epoch + 290 };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
async function sign(payload) {
  const signed = `${encode({ alg: 'RS256', kid: 'test' })}.${encode(payload)}`;
  return `${signed}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(signed))).toString('base64url')}`;
}

test('only the exact main public workflow can authenticate', async () => {
  assert.equal((await verifyGitHubOidc(await sign(claims), fetcher, now)).run_id, '123');
  assert.ok(await verifyGitHubOidc(await sign({ ...claims, event_name: 'workflow_dispatch' }), fetcher, now));
  for (const override of [
    { repository: 'fork/midas-paper-lab' }, { repository_id: '1' }, { repository_owner_id: '1' },
    { repository: 'mamg97/personal_mamg' }, { repository_owner: 'other' },
    { ref: 'refs/heads/feature' }, { sub: 'repo:mamg97/midas-paper-lab:pull_request' },
    { workflow_ref: 'mamg97/midas-paper-lab/.github/workflows/other.yml@refs/heads/main' },
    { sub: 'repo:mamg97/midas-paper-lab:ref:refs/heads/main' },
    { sub: 'repo:mamg97@1/midas-paper-lab@1392125585:ref:refs/heads/main' },
    { sub: 'repo:mamg97@110605707/midas-paper-lab@1:ref:refs/heads/main' },
    { event_name: 'pull_request' }, { event_name: 'pull_request_target' }, { event_name: 'push' },
    { aud: 'other' }, { iss: 'https://example.invalid' }, { exp: epoch },
    { iat: epoch + 61 }, { exp: epoch + 1000 }, { exp: epoch - 20 }, { nbf: epoch + 61 }
  ]) assert.equal(await verifyGitHubOidc(await sign({ ...claims, ...override }), fetcher, now), null, JSON.stringify(override));
  const token = await sign(claims);
  assert.equal(await verifyGitHubOidc(`${token.slice(0, -8)}AAAAAAAA`, fetcher, now), null);
});

function snapshot(days = [['2026-10-12', 100000]], hash = 'a') {
  return { schema_version: 1, strategy_id: 'genetic_sp500_forward', quality: 'next_open_raw_ohlc_v1',
    initial_capital: 100000, ledger_sha256: hash.repeat(64), equity_history: days };
}

test('a forward curve cannot relabel the interrupted cohort', () => {
  assert.equal(normalizeSnapshot(snapshot([['2026-09-29', 100000]]), '123'), null);
});

test('ingest is idempotent, append-only and rejects concurrent changes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetcher;
  let stored = null;
  let conflict = false;
  const db = { prepare(sql) { return {
    run: async () => ({}),
    bind(...args) { return {
      first: async () => stored,
      run: async () => {
        if (conflict) return { meta: { changes: 0 } };
        stored = { last_session: args[1], source_run_id: args[2], payload: args[3] };
        assert.match(sql, /midas_legacy_snapshot.payload = \?/);
        return { meta: { changes: 1 } };
      }
    }; }
  }; } };
  const send = async (body, runId = '123') => worker.fetch(new Request('https://example.invalid/v1/snapshot', {
    method: 'POST', headers: { Authorization: `Bearer ${await sign({ ...claims, run_id: runId })}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }), { DB: db });
  try {
    assert.equal((await send(snapshot())).status, 200);
    const firstStored = stored.payload;
    const repeat = await send(snapshot(), '1');
    assert.equal(repeat.status, 200);
    assert.equal((await repeat.json()).idempotent, true);
    assert.equal(stored.payload, firstStored);
    assert.equal((await send(snapshot(undefined, 'b'))).status, 409);
    assert.equal((await send(snapshot([['2026-10-12', 99999], ['2026-10-13', 100001]], 'b'))).status, 409);
    conflict = true;
    assert.equal((await send(snapshot([['2026-10-12', 100000], ['2026-10-13', 100001]], 'b'))).status, 409);
    conflict = false;
    assert.equal((await send(snapshot([['2026-10-12', 100000], ['2026-10-13', 100001]], 'b'))).status, 200);
    assert.equal((await send(snapshot())).status, 409);
  } finally { globalThis.fetch = originalFetch; }
});
