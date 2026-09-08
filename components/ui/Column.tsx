'use client';
import { type Status } from '@/lib/demo';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

interface ColumnProps {
  status: Status;
  count: number;
  children: ReactNode;
  onAdd: () => void;
}

export default function Column({ status, count, children, onAdd }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const statuses = [
    'New / Open',
    'On Review',
    'In Progress',
    'Waiting on User',
    'Resolved',
    'Closed',
  ] as const;

  return (
    <section ref={setNodeRef} className={`kanban-column ${isOver ? 'over' : ''}`}>
      <header>
        <span className={`status-dot status-${statuses.indexOf(status)}`} />
        <h3>{status}</h3>
        <span className="count">{count}</span>
        <button aria-label={`Buat tiket ${status}`} onClick={onAdd}>
          <Plus size={16} />
        </button>
      </header>
      <div className="column-cards">{children}</div>
      <button className="add-column" onClick={onAdd}>
        <Plus size={14} /> Tambah tiket
      </button>
    </section>
  );
}
