'use client';
import { Column, TicketCard } from '@/components/ui';
import TicketFilters, { type TicketFiltersProps } from '@/components/ui/TicketFilters';
import { statuses, type Category, type Member, type Status, type Ticket } from '@/lib/demo';
import { canUpdateTicket, type Permission, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Activity, CircleCheck, Clock3, Tickets } from 'lucide-react';

interface BoardViewProps {
  filteredTickets: Ticket[];
  visibleTickets: Ticket[];
  team: Member[];
  roles: RoleDefinition[];
  projects: Project[];
  categories: Category[];
  user: Member;
  onCreate: () => void;
  onSelect: (id: string) => void;
  moveTicket: (id: string, status: Status) => void;
  canManage: boolean;
  can: (key: Permission) => boolean;
  overdueCount: number;
  filterControls: TicketFiltersProps;
  setMine: (value: boolean) => void;
}

export default function BoardView({
  filteredTickets,
  visibleTickets,
  team,
  roles,
  projects,
  categories,
  user,
  onCreate,
  onSelect,
  moveTicket,
  can,
  overdueCount,
  filterControls,
  setMine,
}: BoardViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const slaFor = (t: Ticket) => categories.find((c) => c.name === t.category)?.resolution ?? 24;

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over && statuses.includes(e.over.id as Status))
      moveTicket(String(e.active.id), e.over.id as Status);
  };

  const stats = [
    {
      label: 'Total tiket',
      value: visibleTickets.length,
      icon: Tickets,
      note: can('view_all') ? 'Dalam project yang dipilih' : 'Dalam cakupan akses Anda',
      color: 'green',
    },
    {
      label: 'Sedang dikerjakan',
      value: visibleTickets.filter((t) => ['On Review', 'In Progress'].includes(t.status)).length,
      icon: Activity,
      note: 'Dalam penanganan tim',
      color: 'blue',
    },
    {
      label: 'Melewati SLA',
      value: overdueCount,
      icon: Clock3,
      note: 'Membutuhkan perhatian',
      color: 'orange',
    },
    {
      label: 'Tiket selesai',
      value: visibleTickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length,
      icon: CircleCheck,
      note: 'Solusi yang sudah diberikan',
      color: 'green',
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div>
              <span>{s.label}</span>
              <span className={`stat-icon ${s.color}`}>
                <s.icon size={18} />
              </span>
            </div>
            <strong>{s.value.toString().padStart(2, '0')}</strong>
            <small>{s.note}</small>
            <svg className={`sparkline ${s.color}`} viewBox="0 0 85 28">
              <path d="M1 25 L12 20 L22 22 L32 12 L42 16 L51 7 L62 11 L73 4 L84 3" />
            </svg>
          </div>
        ))}
      </div>

      <div className="board-toolbar">
        <div className="board-tabs">
          <button
            className={!filterControls.filters.mine ? 'selected' : ''}
            onClick={() => setMine(false)}
          >
            {can('view_all') ? 'Semua tiket' : 'Tiket yang dapat diakses'}{' '}
            <span>{visibleTickets.length}</span>
          </button>
          <button
            className={filterControls.filters.mine ? 'selected' : ''}
            onClick={() => setMine(true)}
          >
            Tiket saya <span>{visibleTickets.filter((t) => t.agent === user.id).length}</span>
          </button>
        </div>
        <div className="team-presence">
          <div>
            {team
              .filter((m) => m.active)
              .slice(0, 4)
              .map((m) => (
                <span key={m.id} className="avatar small color-0">
                  {m.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
              ))}
          </div>
          <span>{team.filter((m) => m.active).length} anggota tim</span>
        </div>
      </div>

      <TicketFilters {...filterControls} />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {statuses.map((status) => (
            <Column
              key={status}
              status={status}
              count={filteredTickets.filter((t) => t.status === status).length}
              onAdd={onCreate}
            >
              {filteredTickets
                .filter((t) => t.status === status)
                .map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    team={team}
                    roles={roles}
                    projects={projects}
                    sla={slaFor(t)}
                    canDrag={canUpdateTicket(user, roles, t)}
                    open={() => onSelect(t.id)}
                  />
                ))}
              {!filteredTickets.some((t) => t.status === status) && (
                <div className="column-empty">Belum ada tiket</div>
              )}
            </Column>
          ))}
        </div>
      </DndContext>

      <footer className="board-footer">
        <span>
          <span className="live-dot" /> Perubahan disimpan di browser ini
        </span>
        <span>
          {filteredTickets.length} tiket ditampilkan <span className="footer-divider">|</span> Geser
          papan untuk melihat semua status
        </span>
      </footer>
    </>
  );
}
