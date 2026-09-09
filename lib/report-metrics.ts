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
    ...ticket.comments.filter((comment) => !comment.internal).map((comment) => comment.at),
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
