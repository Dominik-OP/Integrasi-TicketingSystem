import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReporterAction,
  reporterActionError,
  trackingTokenHash,
} from '../lib/reporter-actions.ts';

const token = 'a'.repeat(64);

test('reporter actions require a tracking token', () => {
  assert.deepEqual(parseReporterAction({ action: 'reply', body: 'Halo' }), {
    ok: false,
    error: 'Buka halaman ini dari link pribadi di email Anda.',
  });
  assert.equal(parseReporterAction({ token: 'not a token', action: 'reply', body: 'x' }).ok, false);
});

test('replies are trimmed and length limited', () => {
  assert.deepEqual(parseReporterAction({ token, action: 'reply', body: '  Masih error  ' }), {
    ok: true,
    token,
    value: { action: 'reply', body: 'Masih error' },
  });
  assert.equal(parseReporterAction({ token, action: 'reply', body: '   ' }).ok, false);
  assert.equal(parseReporterAction({ token, action: 'reply', body: 'x'.repeat(5001) }).ok, false);
});

test('reopening a resolution needs a reason, confirming does not', () => {
  assert.equal(parseReporterAction({ token, action: 'confirm', resolved: false }).ok, false);
  assert.deepEqual(parseReporterAction({ token, action: 'confirm', resolved: true }), {
    ok: true,
    token,
    value: { action: 'confirm', resolved: true, note: '' },
  });
  assert.equal(parseReporterAction({ token, action: 'confirm', resolved: 'yes' }).ok, false);
});

test('feedback ratings must be whole numbers from 1 to 5', () => {
  for (const rating of [0, 6, 2.5, 'x']) {
    assert.equal(parseReporterAction({ token, action: 'feedback', rating }).ok, false);
  }
  assert.deepEqual(
    parseReporterAction({ token, action: 'feedback', rating: '4', comment: ' ok ' }),
    {
      ok: true,
      token,
      value: { action: 'feedback', rating: 4, comment: 'ok' },
    }
  );
});

test('database errors map to reporter-facing messages without leaking details', () => {
  assert.deepEqual(reporterActionError('too many replies'), {
    error: 'Terlalu banyak balasan dalam waktu singkat. Coba lagi beberapa menit lagi.',
    status: 429,
  });
  assert.equal(reporterActionError('tracking link is invalid or expired').status, 404);
  assert.deepEqual(reporterActionError('relation "x" does not exist'), {
    error: 'Aksi gagal diproses. Coba lagi nanti.',
    status: 400,
  });
});

test('tracking token hashes match the stored sha256 format', () => {
  assert.match(trackingTokenHash(token), /^[0-9a-f]{64}$/);
  assert.equal(trackingTokenHash(token), trackingTokenHash(token));
});
