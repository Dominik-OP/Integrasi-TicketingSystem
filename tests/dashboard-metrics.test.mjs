import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryShare,
  dayKey,
  firstResponseByDay,
  formatHours,
  percentChange,
  priorityByDay,
  recentActivity,
  ticketVolume,
} from '../lib/report-metrics.ts';

const now = new Date(2026, 8, 10, 15, 0).getTime();
const at = (daysAgo, hour = 9) => new Date(2026, 8, 10 - daysAgo, hour, 0).toISOString();
const ticket = (overrides) => ({
  id: 'T-1',
  created: at(0),
  updated: at(0),
  status: 'New / Open',
  category: 'Bug',
  priority: 'Medium',
  comments: [],
  history: [],
  ...overrides,
});

test('ticket volume counts created and completed tickets per local day', () => {
  const rows = ticketVolume(
    [
      ticket({ created: at(2) }),
      ticket({ created: at(1), status: 'Resolved', resolution: { at: at(0) } }),
      ticket({ created: at(9) }),
    ],
    3,
    now
  );
  assert.deepEqual(
    rows.map((row) => row.date),
    [dayKey(at(2)), dayKey(at(1)), dayKey(at(0))]
  );
  assert.deepEqual(
    rows.map((row) => [row.created, row.completed]),
    [
      [1, 0],
      [1, 0],
      [0, 1],
    ]
  );
});

test('priority rows ignore unknown priorities and tickets outside the window', () => {
  const rows = priorityByDay(
    [
      ticket({ priority: 'Urgent' }),
      ticket({ priority: 'Unknown' }),
      ticket({ priority: 'Low', created: at(5) }),
    ],
    2,
    now
  );
  assert.deepEqual(rows.at(-1), { date: dayKey(at(0)), Low: 0, Medium: 0, High: 0, Urgent: 1 });
  assert.equal(
    rows.reduce((sum, row) => sum + row.Low, 0),
    0
  );
});

test('category share keeps the top categories and groups the rest', () => {
  const tickets = ['A', 'A', 'A', 'B', 'B', 'C', 'D', 'E', 'F'].map((category) =>
    ticket({ category })
  );
  assert.deepEqual(categoryShare(tickets, 3), [
    { name: 'A', count: 3 },
    { name: 'B', count: 2 },
    { name: 'C', count: 1 },
    { name: 'Lainnya', count: 3 },
  ]);
});

test('first response per day averages answered tickets and leaves gaps as null', () => {
  const rows = firstResponseByDay(
    [
      ticket({ created: at(0, 8), comments: [{ text: 'Hi', at: at(0, 10), internal: false }] }),
      ticket({ created: at(0, 8), comments: [{ text: 'Hi', at: at(0, 12), internal: false }] }),
      ticket({ created: at(0, 8), comments: [{ text: 'Note', at: at(0, 9), internal: true }] }),
    ],
    2,
    now
  );
  assert.deepEqual(rows, [
    { date: dayKey(at(1)), hours: null },
    { date: dayKey(at(0)), hours: 3 },
  ]);
});

test('recent activity is newest first across tickets', () => {
  const items = recentActivity(
    [
      ticket({ id: 'T-1', history: [{ text: 'Tiket dibuat', at: at(2) }] }),
      ticket({ id: 'T-2', history: [{ text: 'Status diubah menjadi Closed', at: at(0) }] }),
    ],
    1
  );
  assert.deepEqual(items, [
    {
      ticketId: 'T-2',
      text: 'Status diubah menjadi Closed',
      at: at(0),
      actorName: undefined,
    },
  ]);
});

test('formatting helpers handle short durations and empty baselines', () => {
  assert.equal(formatHours(0.5), '30 mnt');
  assert.equal(formatHours(2.25), '2.3 jam');
  assert.equal(percentChange(15, 10), 50);
  assert.equal(percentChange(5, 0), 0);
});
