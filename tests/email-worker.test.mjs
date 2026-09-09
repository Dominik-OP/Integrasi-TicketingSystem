import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadWorkerHelpers() {
  const source = await readFile('functions/dispatch-ticket-email.ts', 'utf8');
  const directory = await mkdtemp(join(tmpdir(), 'integrasi-email-worker-'));
  const modulePath = join(directory, 'worker.ts');
  const testableSource = source.replace(
    "import { createAdminClient } from 'npm:@insforge/sdk';",
    'const createAdminClient = () => ({})'
  );
  await writeFile(modulePath, testableSource);
  const module = await import(`${pathToFileURL(modulePath).href}?test=${Date.now()}`);
  return { module, cleanup: () => rm(directory, { recursive: true, force: true }) };
}

test('email worker escapes reporter-controlled HTML', async (context) => {
  const { module, cleanup } = await loadWorkerHelpers();
  context.after(cleanup);
  assert.equal(
    module.escapeHtml('<img src=x onerror="alert(1)"> & test'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; test'
  );
});

test('email delivery idempotency key is stable per event, audience, and recipient', async (context) => {
  const { module, cleanup } = await loadWorkerHelpers();
  context.after(cleanup);
  const first = await module.deliveryKey('event-1', 'reporter', 'USER@example.com');
  const same = await module.deliveryKey('event-1', 'reporter', 'user@example.com');
  const team = await module.deliveryKey('event-1', 'team', 'user@example.com');
  assert.equal(first, same);
  assert.notEqual(first, team);
  assert.match(first, /^ticket-email\/event-1\/reporter\/[0-9a-f]{16}$/);
});

test('tracking token derivation is deterministic without exposing its secret', async (context) => {
  const { module, cleanup } = await loadWorkerHelpers();
  context.after(cleanup);
  const first = await module.hmacSha256('private-secret', 'event:ticket:user');
  const same = await module.hmacSha256('private-secret', 'event:ticket:user');
  const other = await module.hmacSha256('private-secret', 'other-event:ticket:user');
  assert.equal(first, same);
  assert.notEqual(first, other);
  assert.equal(first.includes('private-secret'), false);
  assert.match(first, /^[0-9a-f]{64}$/);
});
