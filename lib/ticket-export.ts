import type { Member, Ticket } from './domain';

const headers = [
  'Nomor tiket',
  'Project',
  'Judul',
  'Kategori',
  'Prioritas',
  'Status',
  'Agent',
  'Role agent',
  'Reviewer',
  'Role reviewer',
  'Dibuat',
];

/** Quotes a CSV cell and neutralizes spreadsheet formula injection (=, +, -, @). */
export const csvCell = (value: string) =>
  '"' + (/^[=+\-@]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';

export function ticketsCsv(
  tickets: Ticket[],
  projectName: (projectId: string | undefined) => string,
  team: Member[],
  roleName: (member: Member) => string
) {
  const person = (id: string) => team.find((member) => member.id === id);
  const rows = tickets.map((ticket) => {
    const agent = person(ticket.agent);
    const reviewer = person(ticket.reviewer);
    return [
      ticket.id,
      projectName(ticket.projectId),
      ticket.title,
      ticket.category,
      ticket.priority,
      ticket.status,
      agent?.name ?? '',
      agent ? roleName(agent) : '',
      reviewer?.name ?? '',
      reviewer ? roleName(reviewer) : '',
      ticket.created,
    ];
  });
  // Leading BOM keeps Excel from misreading UTF-8 names.
  return '﻿' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
