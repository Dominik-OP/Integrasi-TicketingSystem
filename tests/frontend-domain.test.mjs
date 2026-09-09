import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultRoles,
  defaults,
  hasPermission,
  canViewTicket,
  canUpdateTicket,
  roleLabel,
} from '../lib/permissions.ts';
import { nextTicketNumber, dayKey } from '../lib/projects.ts';

const projects = [
  { id: 'app', name: 'App Test', prefix: 'APP', description: '', active: true },
  { id: 'web', name: 'Web Test', prefix: 'WEB', description: '', active: true },
];

const agent = {
  id: 'a',
  name: 'Agent Test',
  email: 'agent@example.com',
  role: 'Agent',
  roleId: 'senior',
  active: true,
};
const own = { id: 'APP-20260907-0001', projectId: 'app', agent: 'a' };
const other = { ...own, agent: 'b' };

test('Agent sees assigned tickets and cannot delegate by default', () => {
  assert.equal(canViewTicket(agent, defaultRoles, own), true);
  assert.equal(canViewTicket(agent, defaultRoles, other), false);
  assert.equal(canUpdateTicket(agent, defaultRoles, own), true);
  assert.equal(hasPermission(agent, defaultRoles, 'assign_ticket'), false);
  assert.equal(roleLabel(agent, defaultRoles), 'Senior Agent');
});
test('View-all override does not allow status changes on another agent’s ticket', () => {
  const overridden = { ...agent, overrides: { view_all: true } };
  assert.equal(canViewTicket(overridden, defaultRoles, other), true);
  assert.equal(canUpdateTicket(overridden, defaultRoles, other), false);
});
test('Explicit deny overrides role grant; inactive members have no permissions', () => {
  assert.equal(
    hasPermission({ ...agent, overrides: { comment: false } }, defaultRoles, 'comment'),
    false
  );
  assert.equal(hasPermission({ ...agent, active: false }, defaultRoles, 'update_status'), false);
});
test('Custom role permissions apply without changing its display name or base', () => {
  const roles = [
    ...defaultRoles,
    {
      id: 'qa',
      name: 'Quality Assurance',
      base: 'Reviewer',
      permissions: { ...defaults('Reviewer'), export_reports: false },
    },
  ];
  const qa = { ...agent, roleId: 'qa' };
  assert.equal(roleLabel(qa, roles), 'Quality Assurance');
  assert.equal(hasPermission(qa, roles, 'assign_ticket'), true);
  assert.equal(hasPermission(qa, roles, 'export_reports'), false);
});
test('Sequence is independent per project and resets each Jakarta day', () => {
  const now = new Date('2026-09-07T10:00:00+07:00');
  const tickets = [
    own,
    { id: 'WEB-20260907-0042', projectId: 'web' },
    { id: 'APP-20260906-0099', projectId: 'app' },
  ];
  assert.equal(nextTicketNumber(projects[0], tickets, now), 'APP-20260907-0002');
  assert.equal(nextTicketNumber(projects[1], tickets, now), 'WEB-20260907-0043');
  assert.equal(
    nextTicketNumber(projects[0], tickets, new Date('2026-09-07T17:00:00Z')),
    'APP-20260908-0001'
  );
  assert.equal(dayKey(new Date('2026-09-07T17:00:00Z')), '20260908');
});
test('Changing prefix preserves sequence for existing project tickets', () => {
  assert.equal(
    nextTicketNumber(
      { ...projects[0], prefix: 'NEW' },
      [own],
      new Date('2026-09-07T10:00:00+07:00')
    ),
    'NEW-20260907-0002'
  );
});
