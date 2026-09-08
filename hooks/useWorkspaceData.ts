'use client';
import {
  seedCategories,
  seedMembers,
  seedTickets,
  type Category,
  type Member,
  type Ticket,
} from '@/lib/demo';
import { upgradeHistory } from '@/lib/history';
import { defaultRoles, roleLabel, type RoleDefinition } from '@/lib/permissions';
import { defaultProjects, newTrackingToken, type Project } from '@/lib/projects';
import { useEffect, useState } from 'react';

/** Hydrate all related records before allowing persistence to write them. */
export function useWorkspaceData(notify: (message: string) => void) {
  const [team, setTeam] = useState<Member[]>(seedMembers);
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [roles, setRoles] = useState<RoleDefinition[]>(defaultRoles);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('integrasi-demo-v2') ?? localStorage.getItem('integrasi-demo-v1');
      const data = raw ? JSON.parse(raw) : null;
      if (
        data &&
        (!Array.isArray(data.tickets) ||
          !Array.isArray(data.team) ||
          !Array.isArray(data.categories))
      )
        throw Error('Invalid demo');
      const loadedTeam: Member[] = data?.team ?? seedMembers;
      const loadedRoles: RoleDefinition[] = data?.roles ?? defaultRoles;
      setTeam(loadedTeam);
      setCategories(data?.categories ?? seedCategories);
      setProjects(data?.projects ?? defaultProjects);
      setRoles(loadedRoles);
      setTickets(
        ((data?.tickets ?? seedTickets()) as Ticket[]).map((ticket, index) => ({
          ...ticket,
          history: upgradeHistory(ticket, loadedTeam, (member) => roleLabel(member, loadedRoles)),
          projectId: ticket.projectId ?? defaultProjects[index % 3]?.id ?? 'app',
          trackingToken: ticket.trackingToken ?? newTrackingToken(),
          impact: ticket.impact ?? '',
        }))
      );
    } catch {
      setTickets(seedTickets());
      notify('Data browser tidak dapat dimuat. Data demo digunakan.');
    }
    setReady(true);
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        'integrasi-demo-v2',
        JSON.stringify({ tickets, team, categories, projects, roles })
      );
    } catch {
      notify('Penyimpanan browser tidak tersedia. Perubahan hanya tersedia selama sesi ini.');
    }
  }, [tickets, team, categories, projects, roles, ready, notify]);
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
  };
}
