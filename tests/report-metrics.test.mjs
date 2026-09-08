import test from 'node:test';
import assert from 'node:assert/strict';
import { closedAt, firstResponseAt, reportMetrics } from '../lib/report-metrics.ts';

const created = '2026-09-07T01:00:00Z';
const ticket = {
  created,
  updated: '2026-09-07T11:00:00Z',
  status: 'Closed',
  category: 'Bug',
  comments: [],
  history: [],
};
test('Closure timestamp remains stable after later comments or edits', () => {
  const closed = { ...ticket, closure: { at: '2026-09-07T03:00:00Z' } };
  assert.equal(closedAt(closed), '2026-09-07T03:00:00Z');
  assert.equal(reportMetrics([closed], [{ name: 'Bug', resolution: 3 }]).resolution, 2);
  assert.equal(reportMetrics([closed], [{ name: 'Bug', resolution: 3 }]).compliance, 100);
});
test('Legacy closure reason events are recognized', () => {
  assert.equal(
    closedAt({
      ...ticket,
      history: [{ text: 'Tiket ditutup: dikonfirmasi', at: '2026-09-07T02:00:00Z' }],
    }),
    '2026-09-07T02:00:00Z'
  );
});
test('First response includes public replies, excludes private notes and reopen events', () => {
  const replied = {
    ...ticket,
    comments: [
      { internal: true, at: '2026-09-07T01:10:00Z' },
      { internal: false, at: '2026-09-07T02:00:00Z' },
    ],
    history: [{ text: 'Status diubah menjadi New / Open', at: created }],
  };
  assert.equal(firstResponseAt(replied), '2026-09-07T02:00:00Z');
  assert.equal(reportMetrics([replied], []).frt, 1);
  assert.equal(reportMetrics([ticket], []).frt, 0);
});
test('Reopen rate counts only reopening after completion and never exceeds 100 percent', () => {
  const reopened = {
    ...ticket,
    status: 'New / Open',
    history: [
      { text: 'Status diubah menjadi Resolved', at: created },
      { text: 'Status diubah menjadi New / Open', at: ticket.updated },
    ],
  };
  const initial = {
    ...ticket,
    status: 'New / Open',
    history: [{ text: 'Status diubah menjadi New / Open', at: created }],
  };
  assert.equal(reportMetrics([reopened, initial], []).reopenRate, 100);
  assert.equal(reportMetrics([initial], []).reopenRate, 0);
});
