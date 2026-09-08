'use client';
import { Empty } from '@/components/ui';
import TicketFilters from '@/components/ui/TicketFilters';
import { date, priorityClass, type Category, type Member, type Ticket } from '@/lib/demo';
import { roleLabel, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';

interface TicketsViewProps {
  filteredTickets: Ticket[];
  visibleTickets: Ticket[];
  team: Member[];
  roles: RoleDefinition[];
  projects: Project[];
  categories: Category[];
  user: Member;
  view: string;
  setView: (v: string) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  canExport: boolean;
  exportCSV: () => void;
  filters: {
    query: string;
    priority: string;
    category: string;
    agent: string;
    statusFilter: string;
    mine: boolean;
  };
  setQuery: (v: string) => void;
  setPriority: (v: string) => void;
  setCategory: (v: string) => void;
  setAgent: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setMine: (v: boolean) => void;
  resetFilters: () => void;
  canViewAll: boolean;
}

export default function TicketsView({
  filteredTickets,
  visibleTickets,
  team,
  roles,
  projects,
  categories,
  user,
  view,
  setView,
  onSelect,
  filters,
  setQuery,
  setPriority,
  setCategory,
  setAgent,
  setStatusFilter,
  setMine,
  resetFilters,
  canViewAll,
}: TicketsViewProps) {
  return (
    <>
      <div className="board-toolbar">
        <div className="board-tabs">
          <button className={!filters.mine ? 'selected' : ''} onClick={() => setMine(false)}>
            {canViewAll ? 'Semua tiket' : 'Tiket yang dapat diakses'}{' '}
            <span>{visibleTickets.length}</span>
          </button>
          <button className={filters.mine ? 'selected' : ''} onClick={() => setMine(true)}>
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

      <TicketFilters
        {...{
          categories,
          team,
          roles,
          view,
          setView,
          filters,
          setQuery,
          setPriority,
          setCategory,
          setAgent,
          setStatusFilter,
          resetFilters,
        }}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tiket / Judul</th>
              <th>Kategori</th>
              <th>Prioritas</th>
              <th>Status</th>
              <th>Agent</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.id} onClick={() => onSelect(t.id)}>
                <td>
                  <button className="table-title" onClick={() => onSelect(t.id)}>
                    <small>
                      {t.id} · {projects.find((p) => p.id === t.projectId)?.name}
                    </small>
                    <strong>{t.title}</strong>
                  </button>
                </td>
                <td>{t.category}</td>
                <td>
                  <span className={`priority ${priorityClass(t.priority)}`}>{t.priority}</span>
                </td>
                <td>
                  <span className="status-inline">
                    <i className={`status-dot status-${statuses.indexOf(t.status)}`} />
                    {t.status}
                  </span>
                </td>
                <td>
                  {team.find((m) => m.id === t.agent)?.name ?? 'Belum ditugaskan'}
                  <small className="table-role">
                    {team.find((m) => m.id === t.agent)
                      ? roleLabel(
                          team.find((m) => m.id === t.agent)!,
                          roles
                        )
                      : ''}
                  </small>
                </td>
                <td>{date(t.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredTickets.length && <Empty />}
      </div>

      <footer className="board-footer">
        <span>
          <span className="live-dot" /> Perubahan disimpan di browser ini
        </span>
        <span>
          {filteredTickets.length} tiket ditampilkan <span className="footer-divider">|</span> Klik
          tiket untuk melihat detail
        </span>
      </footer>
    </>
  );
}

const statuses = [
  'New / Open',
  'On Review',
  'In Progress',
  'Waiting on User',
  'Resolved',
  'Closed',
] as const;
