'use client';
import { Dashboard } from '@/components/efferd/dashboard';
import type { DashboardStat } from '@/components/efferd/stats';
import { Empty } from '@/components/ui';
import Select from '@/components/ui/Select';
import { type Category, type Member, type Ticket } from '@/lib/domain';
import { baseRole, roleLabel, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import {
  categoryShare,
  firstResponseByDay,
  formatHours,
  isCompleted,
  percentChange,
  priorityByDay,
  recentActivity,
  type reportMetrics,
  ticketVolume,
} from '@/lib/report-metrics';
import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';

interface ReportsViewProps {
  reportTickets: Ticket[];
  previousTickets: Ticket[];
  previousMetrics: ReturnType<typeof reportMetrics>;
  closed: Ticket[];
  reviewed: Ticket[];
  overdue: Ticket[];
  frt: number;
  resolution: number;
  compliance: number;
  reopenRate: number;
  team: Member[];
  roles: RoleDefinition[];
  projects: Project[];
  categories: Category[];
  user: Member;
  period: string;
  setPeriod: (v: string) => void;
  reportAgent: string;
  setReportAgent: (v: string) => void;
  canExport: boolean;
  exportCSV: () => void;
  onSelectTicket: (id: string) => void;
  onViewTickets: () => void;
  onViewAgentTickets: (id: string) => void;
}

export default function ReportsView({
  reportTickets,
  previousTickets,
  previousMetrics,
  closed,
  reviewed,
  overdue,
  frt,
  resolution,
  compliance,
  reopenRate,
  team,
  roles,
  user,
  period,
  setPeriod,
  reportAgent,
  setReportAgent,
  onSelectTicket,
  onViewTickets,
  onViewAgentTickets,
}: ReportsViewProps) {
  const periodDays = Number(period);
  const isAgent = baseRole(user, roles) === 'Agent';
  const footnote = 'vs periode sebelumnya';

  const stats: DashboardStat[] = [
    {
      label: 'First response time',
      value: reviewed.length ? formatHours(frt) : '—',
      delta:
        reviewed.length && previousMetrics.reviewed.length
          ? percentChange(frt, previousMetrics.frt)
          : null,
      footnote,
      lowerIsBetter: true,
    },
    {
      label: 'Waktu penyelesaian',
      value: closed.length ? formatHours(resolution) : '—',
      delta:
        closed.length && previousMetrics.closed.length
          ? percentChange(resolution, previousMetrics.resolution)
          : null,
      footnote,
      lowerIsBetter: true,
    },
    {
      label: 'SLA compliance',
      value: closed.length ? `${compliance}%` : '—',
      delta:
        closed.length && previousMetrics.closed.length
          ? compliance - previousMetrics.compliance
          : null,
      deltaSuffix: ' poin',
      footnote,
      lowerIsBetter: false,
    },
    {
      label: 'Reopen rate',
      value: reportTickets.length ? `${reopenRate}%` : '—',
      delta:
        reportTickets.length && previousTickets.length
          ? reopenRate - previousMetrics.reopenRate
          : null,
      deltaSuffix: ' poin',
      footnote,
      lowerIsBetter: true,
    },
  ];

  const series = useMemo(
    () => ({
      volume: ticketVolume(reportTickets, periodDays),
      categories: categoryShare(reportTickets),
      priorities: priorityByDay(reportTickets, Math.min(periodDays, 10)),
      firstResponse: firstResponseByDay(reportTickets, 7),
      recentTickets: [...reportTickets]
        .sort((a, b) => Date.parse(b.created) - Date.parse(a.created))
        .slice(0, 5),
      activity: recentActivity(reportTickets),
    }),
    [reportTickets, periodDays]
  );
  const overdueIds = useMemo(() => new Set(overdue.map((ticket) => ticket.id)), [overdue]);
  const teammates = team
    .filter(
      (m) => (!isAgent || m.id === user.id) && (isAgent || !reportAgent || m.id === reportAgent)
    )
    .map((m) => {
      const assigned = reportTickets.filter((t) => t.agent === m.id);
      return {
        id: m.id,
        name: m.name,
        role: roleLabel(m, roles),
        active: m.active,
        open: assigned.filter((t) => !isCompleted(t)).length,
        completed: assigned.filter(isCompleted).length,
      };
    })
    .sort((a, b) => b.open - a.open)
    .slice(0, 6);

  return (
    <>
      {reportTickets.length === 0 && <Empty text="Tidak ada data tiket untuk periode ini." />}
      <div className="report-filters">
        <CalendarDays size={18} />
        <Select
          aria-label="Periode laporan"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7">7 hari terakhir</option>
          <option value="30">30 hari terakhir</option>
          <option value="90">90 hari terakhir</option>
        </Select>
        <Select
          aria-label="Filter agent laporan"
          disabled={isAgent}
          value={isAgent ? user.id : reportAgent}
          onChange={(e) => setReportAgent(e.target.value)}
        >
          <option value="">Semua agent</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {roleLabel(m, roles)}
            </option>
          ))}
        </Select>
        <span className="muted">Berdasarkan {reportTickets.length} tiket</span>
      </div>

      <Dashboard
        activity={series.activity}
        categories={series.categories}
        firstResponse={series.firstResponse}
        onSelectTicket={onSelectTicket}
        onViewAgentTickets={onViewAgentTickets}
        onViewTickets={onViewTickets}
        overdueIds={overdueIds}
        periodDays={periodDays}
        priorities={series.priorities}
        recentTickets={series.recentTickets}
        stats={stats}
        teammates={teammates}
        volume={series.volume}
        volumeGrowth={
          previousTickets.length
            ? percentChange(reportTickets.length, previousTickets.length)
            : null
        }
      />
    </>
  );
}
