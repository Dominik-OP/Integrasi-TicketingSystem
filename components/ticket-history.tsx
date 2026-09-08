import { date, type Ticket } from '@/lib/demo';

export default function TicketHistory({ history }: { history: Ticket['history'] }) {
  return (
    <div className="timeline">
      {history.map((event, index) => (
        <div key={index}>
          <i />
          <strong>{event.text}</strong>
          <span className="history-actor">
            {event.actorName ?? 'Tim support'}{' '}
            <span className="category-tag">{event.actorRole ?? 'Role belum tercatat'}</span>
          </span>
          <small>{date(event.at)}</small>
        </div>
      ))}
    </div>
  );
}
