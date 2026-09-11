import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, ticketsCsv } from '../lib/ticket-export.ts';

test('csv cells are quoted and neutralize spreadsheet formulas', () => {
  assert.equal(csvCell('Login "gagal"'), '"Login ""gagal"""');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+62 812'), '"\'+62 812"');
});

test('ticket export resolves project, agent and reviewer names', () => {
  const team = [
    { id: 'u1', name: 'Rina', email: 'r@x.id', role: 'Agent', active: true },
    { id: 'u2', name: 'Sari', email: 's@x.id', role: 'Reviewer', active: true },
  ];
  const csv = ticketsCsv(
    [
      {
        id: 'APP-20260910-0001',
        projectId: 'app',
        title: 'Tidak bisa login',
        category: 'Akses & Akun',
        priority: 'High',
        status: 'In Progress',
        agent: 'u1',
        reviewer: 'missing',
        created: '2026-09-10T02:00:00.000Z',
      },
    ],
    (id) => (id === 'app' ? 'Aplikasi Utama' : ''),
    team,
    (member) => `${member.role} lead`
  );
  assert.ok(csv.startsWith('﻿"Nomor tiket"'));
  const [, row] = csv.slice(1).split('\r\n');
  assert.equal(
    row,
    '"APP-20260910-0001","Aplikasi Utama","Tidak bisa login","Akses & Akun","High","In Progress","Rina","Agent lead","","","2026-09-10T02:00:00.000Z"'
  );
});
