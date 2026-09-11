'use client';
import type { Category, Member, Ticket } from '@/lib/domain';
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
  // Tickets created `from` to `to` periods ago, so 0–1 is the selected period and 1–2 the one before.
  const ticketsInPeriods = useMemo(() => {
    const periodMs = Number(period) * 86400000;
    return (from: number, to: number) =>
      visibleTickets.filter((ticket) => {
        const age = Date.now() - Date.parse(ticket.created);
        return (
          (baseRole(user, roles) !== 'Agent' || ticket.agent === user.id) &&
          (from === 0 || age >= from * periodMs) &&
          age < to * periodMs &&
          (baseRole(user, roles) === 'Agent' || !reportAgent || ticket.agent === reportAgent)
        );
      });
  }, [visibleTickets, roles, user, period, reportAgent]);
  const reportTickets = useMemo(() => ticketsInPeriods(0, 1), [ticketsInPeriods]);
  const previousTickets = useMemo(() => ticketsInPeriods(1, 2), [ticketsInPeriods]);
  const metrics = useMemo(
    () => reportMetrics(reportTickets, categories),
    [reportTickets, categories]
  );
  const previousMetrics = useMemo(
    () => reportMetrics(previousTickets, categories),
    [previousTickets, categories]
  );
  return { reportTickets, previousTickets, previousMetrics, overdue, ...metrics };
}
