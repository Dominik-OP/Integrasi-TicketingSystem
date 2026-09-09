import test from 'node:test';
import assert from 'node:assert/strict';
import { emailDomain, isAllowedTeamEmail, normalizeEmail } from '../lib/auth/access.ts';

test('team email matching normalizes case and surrounding whitespace', () => {
  assert.equal(normalizeEmail('  User@Adiraja-Integrasi.com '), 'user@adiraja-integrasi.com');
  assert.equal(emailDomain('User@Adiraja-Integrasi.com'), 'adiraja-integrasi.com');
  assert.equal(
    isAllowedTeamEmail('User@Adiraja-Integrasi.com', 'adiraja-integrasi.com'),
    true
  );
});

test('team email matching rejects lookalike and subdomains', () => {
  assert.equal(
    isAllowedTeamEmail('user@eviladiraja-integrasi.com', 'adiraja-integrasi.com'),
    false
  );
  assert.equal(
    isAllowedTeamEmail('user@staff.adiraja-integrasi.com', 'adiraja-integrasi.com'),
    false
  );
  assert.equal(isAllowedTeamEmail('not-an-email', 'adiraja-integrasi.com'), false);
});
