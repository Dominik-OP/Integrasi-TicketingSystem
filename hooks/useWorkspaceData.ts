'use client';
import type { Category, Member, TeamAccessRequest, Ticket } from '@/lib/domain';
import type { RoleDefinition } from '@/lib/permissions';
import type { Project } from '@/lib/projects';
import { useCallback, useEffect, useState } from 'react';

export function useWorkspaceData(notify: (message: string) => void) {
  const [team, setTeam] = useState<Member[]>([]);
  const [accessRequests, setAccessRequests] = useState<TeamAccessRequest[]>([]);
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
        setAccessRequests(data.accessRequests ?? []);
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
        setAccessRequests([]);
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

  const saveProject = useCallback(
    async (project: Project) => {
      const response = await fetch('/api/projects', {
        method: project.databaseId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(project),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Project gagal disimpan.');
      await reload();
    },
    [reload]
  );

  const saveMember = useCallback(
    async (member: Member) => {
      const response = await fetch(`/api/team/members/${encodeURIComponent(member.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(member),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Anggota gagal disimpan.');
      await reload();
    },
    [reload]
  );

  const saveCategory = useCallback(
    async (category: Category) => {
      const response = await fetch('/api/categories', {
        method: category.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(category),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Kategori gagal disimpan.');
      await reload();
    },
    [reload]
  );

  const saveRole = useCallback(
    async (role: RoleDefinition) => {
      const exists = roles.some((item) => item.id === role.id);
      const response = await fetch('/api/roles', {
        method: exists ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(role),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Role gagal disimpan.');
      await reload();
    },
    [reload, roles]
  );

  return {
    team,
    setTeam,
    accessRequests,
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
    saveProject,
    saveMember,
    saveCategory,
    saveRole,
  };
}
