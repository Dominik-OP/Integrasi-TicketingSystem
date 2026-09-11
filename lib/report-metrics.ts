import type { Category, Ticket } from './domain';

export const closedAt = (ticket: Ticket) =>
  ticket.closure?.at ??
  [...ticket.history]
    .reverse()
    .find(
      (entry) =>
        entry.text.includes('Status diubah menjadi Closed') ||
        entry.text.startsWith('Tiket ditutup:')
    )?.at ??
  ticket.updated;
export function firstResponseAt(ticket: Ticket) {
  const candidates = [
    ...ticket.history
      .filter(
        (entry) =>
          entry.text.includes('Status diubah menjadi') && !entry.text.includes('New / Open')
      )
      .map((entry) => entry.at),
    ...ticket.comments
      .filter((comment) => !comment.internal && !comment.fromReporter)
      .map((comment) => comment.at),
  ]
    .filter((at) => Number.isFinite(Date.parse(at)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return candidates[0];
}
const hours = (start: string, end: string) =>
  Math.max(0, (Date.parse(end) - Date.parse(start)) / 3600000);
export function reportMetrics(tickets: Ticket[], categories: Category[]) {
  const closed = tickets.filter((ticket) => ticket.status === 'Closed');
  const reviewed = tickets.filter((ticket) => firstResponseAt(ticket));
  const completed = tickets.filter(
    (ticket) =>
      ['Resolved', 'Closed'].includes(ticket.status) ||
      ticket.history.some((entry) =>
        /Status diubah menjadi (Resolved|Closed)|^Tiket ditutup:/.test(entry.text)
      )
  );
  const reopened = completed.filter((ticket) => {
    let wasCompleted = false;
    return ticket.history.some((entry) => {
      if (/Status diubah menjadi (Resolved|Closed)|^Tiket ditutup:/.test(entry.text))
        wasCompleted = true;
      return wasCompleted && entry.text.includes('Status diubah menjadi New / Open');
    });
  });
  return {
    closed,
    reviewed,
    frt: reviewed.length
      ? reviewed.reduce(
          (total, ticket) => total + hours(ticket.created, firstResponseAt(ticket)!),
          0
        ) / reviewed.length
      : 0,
    resolution: closed.length
      ? closed.reduce((total, ticket) => total + hours(ticket.created, closedAt(ticket)), 0) /
        closed.length
      : 0,
    compliance: closed.length
      ? Math.round(
          (100 *
            closed.filter(
              (ticket) =>
                hours(ticket.created, closedAt(ticket)) <=
                (categories.find((category) => category.name === ticket.category)?.resolution ?? 24)
            ).length) /
            closed.length
        )
      : 0,
    reopenRate: completed.length ? Math.round((100 * reopened.length) / completed.length) : 0,
  };
}

/* Dashboard series. Days are local calendar days keyed as YYYY-MM-DD. */
export const dayKey = (value: string | number | Date) => {
  const day = new Date(value);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
    day.getDate()
  ).padStart(2, '0')}`;
};
const lastDays = (count: number, now: number) =>
  Array.from({ length: count }, (_, index) => {
    const day = new Date(now);
    day.setDate(day.getDate() - (count - 1 - index));
    return dayKey(day);
  });
export const isCompleted = (ticket: Ticket) =>
  ticket.status === 'Resolved' || ticket.status === 'Closed';
const completedAt = (ticket: Ticket) =>
  ticket.status === 'Closed' ? closedAt(ticket) : (ticket.resolution?.at ?? ticket.updated);
export const percentChange = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : 0;

export function ticketVolume(tickets: Ticket[], days: number, now = Date.now()) {
  const rows = lastDays(days, now).map((date) => ({ date, created: 0, completed: 0 }));
  const byDate = new Map(rows.map((row) => [row.date, row]));
  for (const ticket of tickets) {
    const created = byDate.get(dayKey(ticket.created));
    if (created) created.created += 1;
    const completed = isCompleted(ticket) ? byDate.get(dayKey(completedAt(ticket))) : undefined;
    if (completed) completed.completed += 1;
  }
  return rows;
}

export const priorityLevels = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type PriorityLevel = (typeof priorityLevels)[number];
export function priorityByDay(tickets: Ticket[], days: number, now = Date.now()) {
  const rows = lastDays(days, now).map(
    (date) =>
      ({ date, Low: 0, Medium: 0, High: 0, Urgent: 0 }) as Record<PriorityLevel, number> & {
        date: string;
      }
  );
  const byDate = new Map(rows.map((row) => [row.date, row]));
  for (const ticket of tickets) {
    const row = byDate.get(dayKey(ticket.created));
    const level = priorityLevels.find((p) => p === ticket.priority);
    if (row && level) row[level] += 1;
  }
  return rows;
}

export function categoryShare(tickets: Ticket[], limit = 4) {
  const counts = new Map<string, number>();
  for (const ticket of tickets) counts.set(ticket.category, (counts.get(ticket.category) ?? 0) + 1);
  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit).map(([name, count]) => ({ name, count }));
  const rest = sorted.slice(limit).reduce((total, [, count]) => total + count, 0);
  return rest ? [...top, { name: 'Lainnya', count: rest }] : top;
}

export function firstResponseByDay(tickets: Ticket[], days: number, now = Date.now()) {
  return lastDays(days, now).map((date) => {
    const answered = tickets.filter(
      (ticket) => dayKey(ticket.created) === date && firstResponseAt(ticket)
    );
    return {
      date,
      hours: answered.length
        ? answered.reduce(
            (total, ticket) => total + hours(ticket.created, firstResponseAt(ticket)!),
            0
          ) / answered.length
        : null,
    };
  });
}

export function recentActivity(tickets: Ticket[], limit = 5) {
  return tickets
    .flatMap((ticket) =>
      ticket.history.map((entry) => ({
        ticketId: ticket.id,
        text: entry.text,
        at: entry.at,
        actorName: entry.actorName,
      }))
    )
    .filter((entry) => Number.isFinite(Date.parse(entry.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}

export const formatHours = (value: number) =>
  value < 1 ? `${Math.round(value * 60)} mnt` : `${value.toFixed(1)} jam`;

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86400000],
  ['hour', 3600000],
  ['minute', 60000],
];
export function timeAgo(value: string, now = Date.now()) {
  const elapsed = Date.parse(value) - now;
  const format = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
  for (const [unit, size] of relativeUnits)
    if (Math.abs(elapsed) >= size) return format.format(Math.round(elapsed / size), unit);
  return 'baru saja';
}
