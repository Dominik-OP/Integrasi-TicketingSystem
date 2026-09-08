'use client';
import type { Category, Member, Ticket } from '@/lib/demo';
import type { RoleDefinition } from '@/lib/permissions';
import type { Project } from '@/lib/projects';
import { useCallback, useEffect, useState } from 'react';

export function useWorkspaceData(notify: (message: string) => void) {
  const [team, setTeam] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const workspace = await fetch('/api/workspace', { cache: 'no-store' });
      if (workspace.ok) {
        const data = await workspace.json();
        setTeam(data.team ?? []);
        setCategories(data.categories ?? []);
        setProjects(data.projects ?? []);
        setRoles(data.roles ?? []);
        setTickets(data.tickets ?? []);
      } else {
        const response = await fetch('/api/public/projects', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProjects(data.projects ?? []);
        setTeam([]);
        setCategories([]);
        setRoles([]);
        setTickets([]);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Backend tidak dapat dihubungi.');
    } finally {
      setReady(true);
    }
  }, [notify]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    team,
    setTeam,
    categories,
    setCategories,
    projects,
    setProjects,
    roles,
    setRoles,
    tickets,
    setTickets,
    ready,
    reload,
  };
}
