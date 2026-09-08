import type { Ticket } from './demo';
export type Project = {
  id: string;
  databaseId?: string;
  name: string;
  prefix: string;
  description: string;
  active: boolean;
};
export const defaultProjects: Project[] = [
  {
    id: 'app',
    name: 'Aplikasi Utama',
    prefix: 'APP',
    description: 'Aplikasi operasional dan layanan utama.',
    active: true,
  },
  {
    id: 'web',
    name: 'Website',
    prefix: 'WEB',
    description: 'Website publik dan pengalaman pelanggan.',
    active: true,
  },
  {
    id: 'internal',
    name: 'Internal Tools',
    prefix: 'INT',
    description: 'Perangkat kerja internal untuk tim.',
    active: true,
  },
];
export function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .replaceAll('-', '');
}
export function nextTicketNumber(project: Project, tickets: Ticket[], now = new Date()) {
  const day = dayKey(now);
  const sequences = tickets
    .filter((t) => t.projectId === project.id && t.id.split('-').at(-2) === day)
    .map((t) => Number(t.id.split('-').at(-1)) || 0);
  return `${project.prefix}-${day}-${String(Math.max(0, ...sequences) + 1).padStart(4, '0')}`;
}
export const newTrackingToken = () =>
  crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
