'use client';
import { Dialog, Empty } from '@/components/ui';
import type { Ticket } from '@/lib/domain';
import { ChevronRight } from 'lucide-react';

export default function AttentionDialog({
  overdue,
  onSelect,
  close,
}: {
  overdue: Ticket[];
  onSelect: (id: string) => void;
  close: () => void;
}) {
  return (
    <Dialog title="Tiket membutuhkan perhatian" close={close}>
      {overdue.length ? (
        <div className="attention-list">
          {overdue.map((ticket) => (
            <button
              key={ticket.id}
              className="outline"
              onClick={() => {
                close();
                onSelect(ticket.id);
              }}
            >
              <span>
                <strong>{ticket.id}</strong>
                <br />
                {ticket.title}
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <Empty text="Tidak ada tiket yang melewati SLA." />
      )}
    </Dialog>
  );
}
