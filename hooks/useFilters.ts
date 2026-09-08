'use client';
import { type Member, type Ticket } from '@/lib/demo';
import { useCallback, useMemo, useState } from 'react';

interface FilterState {
  query: string;
  priority: string;
  category: string;
  agent: string;
  statusFilter: string;
  mine: boolean;
}

interface UseFiltersReturn {
  filters: FilterState;
  setQuery: (v: string) => void;
  setPriority: (v: string) => void;
  setCategory: (v: string) => void;
  setAgent: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setMine: (v: boolean) => void;
  resetFilters: () => void;
  filteredTickets: Ticket[];
}

export function useFilters(visibleTickets: Ticket[], user: Member): UseFiltersReturn {
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    priority: '',
    category: '',
    agent: '',
    statusFilter: '',
    mine: false,
  });

  const filteredTickets = useMemo(() => {
    return visibleTickets.filter((t) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        if (!`${t.id} ${t.title} ${t.name}`.toLowerCase().includes(q)) return false;
      }
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.agent && t.agent !== filters.agent) return false;
      if (filters.statusFilter && t.status !== filters.statusFilter) return false;
      if (filters.mine && t.agent !== user.id) return false;
      return true;
    });
  }, [visibleTickets, filters, user.id]);

  const setQuery = useCallback((v: string) => setFilters((f) => ({ ...f, query: v })), []);
  const setPriority = useCallback((v: string) => setFilters((f) => ({ ...f, priority: v })), []);
  const setCategory = useCallback((v: string) => setFilters((f) => ({ ...f, category: v })), []);
  const setAgent = useCallback((v: string) => setFilters((f) => ({ ...f, agent: v })), []);
  const setStatusFilter = useCallback(
    (v: string) => setFilters((f) => ({ ...f, statusFilter: v })),
    []
  );
  const setMine = useCallback((v: boolean) => setFilters((f) => ({ ...f, mine: v })), []);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      priority: '',
      category: '',
      agent: '',
      statusFilter: '',
      mine: false,
    });
  }, []);

  return {
    filters,
    setQuery,
    setPriority,
    setCategory,
    setAgent,
    setStatusFilter,
    setMine,
    resetFilters,
    filteredTickets,
  };
}
