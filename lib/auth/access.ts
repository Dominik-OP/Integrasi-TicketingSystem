export const TEAM_ACCESS_STATUSES = [
  'unauthenticated',
  'active',
  'pending',
  'rejected',
  'inactive',
  'unauthorized',
] as const;

export type TeamAccessStatus = (typeof TEAM_ACCESS_STATUSES)[number];

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function emailDomain(value: string) {
  const email = normalizeEmail(value);
  const separator = email.lastIndexOf('@');
  return separator > 0 ? email.slice(separator + 1) : '';
}

export function isAllowedTeamEmail(value: string, allowedDomain: string) {
  return emailDomain(value) === allowedDomain.trim().toLowerCase();
}

export function configuredTeamDomain() {
  const domain = process.env.TEAM_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain || domain.includes('@') || domain.includes(' ')) {
    throw new Error('Konfigurasi TEAM_EMAIL_DOMAIN belum valid.');
  }
  return domain;
}
