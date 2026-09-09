import test from 'node:test';
import assert from 'node:assert/strict';
import { upgradeHistory } from '../lib/history.ts';

const member = { id: '2', name: 'Pengguna Uji' };
test('Legacy activity with a named actor receives their custom role', () => {
  const ticket = {
    name: 'Budi',
    history: [
      {
        text: 'Status diubah menjadi On Review · Pengguna Uji',
        at: '2026-09-07',
      },
    ],
  };
  const [event] = upgradeHistory(ticket, [member], () => 'Team Lead');
  assert.equal(event.actorName, 'Pengguna Uji');
  assert.equal(event.actorRole, 'Team Lead');
  assert.equal(event.text, 'Status diubah menjadi On Review');
});
test('Recorded role remains unchanged after master role is renamed', () => {
  const event = {
    text: 'Status diubah menjadi On Review',
    actorName: 'Pengguna Uji',
    actorRole: 'Team Lead',
    at: '2026-09-07',
  };
  assert.deepEqual(upgradeHistory({ history: [event] }, [member], () => 'QA')[0], event);
});
test('Legacy unknown actors are not falsely attributed to the current assignee', () => {
  const ticket = {
    name: 'Budi',
    history: [
      { text: 'Tiket dibuat oleh pelapor', at: '2026-09-07' },
      { text: 'Status diubah menjadi Resolved', at: '2026-09-07' },
    ],
  };
  const [created, unknown] = upgradeHistory(ticket, [member], () => 'QA');
  assert.equal(created.actorName, 'Budi');
  assert.equal(created.actorRole, 'Pelapor');
  assert.equal(unknown.actorRole, 'Role belum tercatat');
});
