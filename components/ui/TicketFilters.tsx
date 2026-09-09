'use client';
import { statuses, type Category, type Member } from '@/lib/domain';
import { roleLabel, type RoleDefinition } from '@/lib/permissions';
import { LayoutDashboard, Search, Tickets, X } from 'lucide-react';
import FilterDropdown from './FilterDropdown';

export interface TicketFiltersProps {
  categories: Category[];
  team: Member[];
  roles: RoleDefinition[];
  view: string;
  setView: (value: string) => void;
  filters: {
    query: string;
    priority: string;
    category: string;
    agent: string;
    statusFilter: string;
    mine: boolean;
  };
  setQuery: (value: string) => void;
  setPriority: (value: string) => void;
  setCategory: (value: string) => void;
  setAgent: (value: string) => void;
  setStatusFilter: (value: string) => void;
  resetFilters: () => void;
}

export default function TicketFilters({
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
}: TicketFiltersProps) {
  const priorityOptions = [
    { value: '', label: 'Prioritas' },
    ...['Urgent', 'High', 'Medium', 'Low'].map((p) => ({ value: p, label: p })),
  ];

  const categoryOptions = [
    { value: '', label: 'Semua kategori' },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const agentOptions = [
    { value: '', label: 'Semua agent' },
    ...team
      .filter((m) => m.active)
      .map((m) => ({
        value: m.id,
        label: `${m.name} — ${roleLabel(m, roles)}`,
      })),
  ];

  const statusOptions = [
    { value: '', label: 'Semua status' },
    ...statuses.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className="filterbar">
      <div className="search-field">
        <Search size={17} />
        <input
          aria-label="Cari tiket"
          placeholder="Cari nomor atau judul tiket..."
          value={filters.query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filters.query && (
          <button onClick={() => setQuery('')} aria-label="Hapus pencarian">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="filter-selects">
        <FilterDropdown
          label="Semua kategori"
          value={filters.category}
          onChange={setCategory}
          options={categoryOptions}
        />
        <FilterDropdown
          label="Prioritas"
          value={filters.priority}
          onChange={setPriority}
          options={priorityOptions}
        />
        <FilterDropdown
          label="Semua agent"
          value={filters.agent}
          onChange={setAgent}
          options={agentOptions}
        />
        <FilterDropdown
          label="Semua status"
          value={filters.statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
        />
        {(filters.query ||
          filters.category ||
          filters.priority ||
          filters.agent ||
          filters.statusFilter) && (
          <button className="text-button" onClick={resetFilters}>
            Reset
          </button>
        )}
      </div>
      <div className="view-toggle">
        <button
          title="Tampilan papan"
          className={view === 'board' ? 'selected' : ''}
          onClick={() => setView('board')}
        >
          <LayoutDashboard size={17} />
        </button>
        <button
          title="Tampilan daftar"
          className={view === 'tickets' ? 'selected' : ''}
          onClick={() => setView('tickets')}
        >
          <Tickets size={17} />
        </button>
      </div>
    </div>
  );
}
