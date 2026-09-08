'use client';
import type { Category, Member, Ticket } from '@/lib/demo';
import { baseRole, type RoleDefinition } from '@/lib/permissions';
import type { Project } from '@/lib/projects';
import { reportMetrics } from '@/lib/report-metrics';
import { useMemo } from 'react';

export function useReports(
  visibleTickets: Ticket[],
  _team: Member[],
  roles: RoleDefinition[],
  user: Member,
  categories: Category[],
  _projects: Project[],
  period: string,
  reportAgent: string
) {
  const overdue = useMemo(
    () =>
      visibleTickets.filter(
        (ticket) =>
          !['Resolved', 'Closed'].includes(ticket.status) &&
          (Date.now() - Date.parse(ticket.created)) / 3600000 >
            (categories.find((category) => category.name === ticket.category)?.resolution ?? 24)
      ),
    [visibleTickets, categories]
  );
  const reportTickets = useMemo(
    () =>
      visibleTickets.filter(
        (ticket) =>
          (baseRole(user, roles) !== 'Agent' || ticket.agent === user.id) &&
          Date.now() - Date.parse(ticket.created) < Number(period) * 86400000 &&
          (baseRole(user, roles) === 'Agent' || !reportAgent || ticket.agent === reportAgent)
      ),
    [visibleTickets, roles, user, period, reportAgent]
  );
  const metrics = useMemo(
    () => reportMetrics(reportTickets, categories),
    [reportTickets, categories]
  );
  return { reportTickets, overdue, ...metrics };
}
