import type { Member, Ticket } from './domain';

export function upgradeHistory(
  ticket: Ticket,
  team: Member[],
  getRole: (member: Member) => string
): Ticket['history'] {
  return ticket.history.map((event) => {
    if (event.actorName && event.actorRole) return event;
    const parts = event.text.split(' · ');
    const name = parts.length > 1 ? parts.at(-1) : undefined;
    const actor = name ? team.find((member) => member.name === name) : undefined;
    const created = event.text === 'Tiket dibuat oleh pelapor';
    return {
      ...event,
      text: actor ? parts.slice(0, -1).join(' · ') : event.text,
      actorId: event.actorId ?? actor?.id ?? '',
      actorName:
        event.actorName ?? (created ? ticket.name : (actor?.name ?? name ?? 'Tim support')),
      actorRole:
        event.actorRole ?? (created ? 'Pelapor' : actor ? getRole(actor) : 'Role belum tercatat'),
    };
  });
}
