'use client';
import { date, type Member, type Ticket } from '@/lib/domain';
import { roleLabel, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import { closedAt } from '@/lib/report-metrics';
import { useDraggable } from '@dnd-kit/core';
import { Clock3, MessageSquare, MoreHorizontal, Paperclip, Users } from 'lucide-react';
import Avatar from './Avatar';

interface TicketCardProps {
  ticket: Ticket;
  team: Member[];
  roles: RoleDefinition[];
  projects: Project[];
  open: () => void;
  sla: number;
  canDrag: boolean;
}

const priorityClass = (p: string) => p.toLowerCase();

export default function TicketCard({
  ticket,
  team,
  roles,
  projects,
  open,
  sla,
  canDrag,
}: TicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !canDrag,
  });

  const agent = team.find(
    (m) => m.id === (ticket.status === 'On Review' ? ticket.reviewer : ticket.agent)
  );

  const remaining = sla - (Date.now() - new Date(ticket.created).getTime()) / 3600000;
  const done = ['Resolved', 'Closed'].includes(ticket.status);

  return (
    <article
      ref={setNodeRef}
      className={`ticket-card ${isDragging ? 'dragging' : ''}`}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px,${transform.y}px,0)`,
              zIndex: 30,
            }
          : undefined
      }
    >
      <div className="card-top">
        <span className="ticket-number">{ticket.id}</span>
        <button
          className="drag-handle"
          aria-label={`Pindahkan ${ticket.id}`}
          {...attributes}
          {...listeners}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      <button className="card-title" onClick={open}>
        {ticket.title}
      </button>
      <div className="card-tags">
        <span className="project-tag">{projects.find((p) => p.id === ticket.projectId)?.name}</span>
        <span className="category-tag">{ticket.category}</span>
      </div>
      <div className="card-badges">
        <span className={`priority ${priorityClass(ticket.priority)}`}>
          <span>▰</span> {ticket.priority}
        </span>
        <span
          className={`sla ${done ? 'safe' : remaining < 0 ? 'late' : remaining < 2 ? 'warning' : 'safe'}`}
        >
          <Clock3 size={11} />
          {done
            ? 'Selesai'
            : remaining < 0
              ? `${Math.ceil(-remaining)}j lewat SLA`
              : `${Math.ceil(remaining)}j tersisa`}
        </span>
      </div>
      <div className="card-time">
        <Clock3 size={11} />
        {ticket.status === 'Waiting on User'
          ? `Menunggu ${Math.max(0, Math.floor((Date.now() - new Date([...ticket.history].reverse().find((h) => h.text.includes('Status diubah menjadi Waiting on User'))?.at ?? ticket.updated).getTime()) / 3600000))} jam`
          : ticket.status === 'Resolved'
            ? `Selesai ${date([...ticket.history].reverse().find((h) => h.text.includes('Status diubah menjadi Resolved'))?.at ?? ticket.updated)}`
            : ticket.status === 'Closed'
              ? `Durasi ${Math.max(0, (new Date(closedAt(ticket)).getTime() - new Date(ticket.created).getTime()) / 3600000).toFixed(1)} jam`
              : `Masuk ${date(ticket.created)}`}
      </div>
      <div className="card-footer">
        <span className="assignee">
          {agent ? (
            <>
              <Avatar name={agent.name} small />
              <span className="assignee-name">
                {agent.name}
                <small>{roleLabel(agent, roles)}</small>
              </span>
            </>
          ) : (
            <>
              <span className="unassigned">
                <Users size={12} />
              </span>
              <span>Belum ditugaskan</span>
            </>
          )}
        </span>
        <span className="card-counts">
          {ticket.attachments.length > 0 && (
            <>
              <Paperclip size={12} />
              {ticket.attachments.length}
            </>
          )}
          <MessageSquare size={12} />
          {ticket.comments.length}
        </span>
      </div>
    </article>
  );
}
