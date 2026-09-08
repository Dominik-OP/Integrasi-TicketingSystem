'use client';
import { Empty } from '@/components/ui';
import Select from '@/components/ui/Select';
import { type Category, type Member, type Ticket } from '@/lib/demo';
import { baseRole, roleLabel, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import { CalendarDays } from 'lucide-react';

interface ReportsViewProps {
  reportTickets: Ticket[];
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
}

export default function ReportsView({
  reportTickets,
  closed,
  frt,
  resolution,
  compliance,
  reopenRate,
  team,
  roles,
  categories,
  user,
  period,
  setPeriod,
  reportAgent,
  setReportAgent,
}: ReportsViewProps) {
  const stats = [
    {
      label: 'First response time',
      value: `${frt.toFixed(1)} jam`,
      sub: 'Rata-rata respons pertama',
    },
    {
      label: 'Waktu penyelesaian',
      value: `${resolution.toFixed(1)} jam`,
      sub: 'Dari dibuat hingga ditutup',
    },
    {
      label: 'SLA compliance',
      value: closed.length ? `${compliance}%` : '—',
      sub: 'Tiket closed sesuai SLA',
    },
    {
      label: 'Reopen rate',
      value: reportTickets.length ? `${reopenRate}%` : '—',
      sub: 'Tiket yang dibuka kembali',
    },
  ];

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
          disabled={baseRole(user, roles) === 'Agent'}
          value={baseRole(user, roles) === 'Agent' ? user.id : reportAgent}
          onChange={(e) => setReportAgent(e.target.value)}
        >
          <option value="">Semua agent</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {roleLabel(m, roles)}
            </option>
          ))}
        </Select>
        <span className="muted">Berdasarkan {reportTickets.length} tiket demo</span>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>

      <div className="report-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Tren tiket masuk</h2>
            <span className="legend">
              <i /> Tiket masuk
            </span>
          </div>
          <p className="muted">Volume laporan selama 7 hari terakhir dalam periode terpilih</p>
          <div className="bar-chart">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - 6 + i);
              const amount = reportTickets.filter(
                (t) => new Date(t.created).toDateString() === d.toDateString()
              ).length;
              return (
                <div key={i}>
                  <strong>{amount}</strong>
                  <div
                    style={{
                      height: `${Math.max(3, (amount / Math.max(1, reportTickets.length)) * 160)}px`,
                    }}
                  />
                  <span>
                    {d.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h2>Distribusi kategori</h2>
          <p className="muted">Kenali kendala yang paling sering dilaporkan</p>
          <div className="category-bars">
            {[
              ...new Set([
                ...categories.map((c) => c.name),
                ...reportTickets.map((t) => t.category),
              ]),
            ].map((name) => {
              const n = reportTickets.filter((t) => t.category === name).length;
              return (
                <div key={name}>
                  <div>
                    <span>{name}</span>
                    <strong>{n} tiket</strong>
                  </div>
                  <div className="progress">
                    <i
                      style={{
                        width: `${(n / Math.max(1, reportTickets.length)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>{baseRole(user, roles) === 'Agent' ? 'Performa saya' : 'Performa anggota tim'}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Anggota</th>
                <th>Peran</th>
                <th>Ditugaskan</th>
                <th>Selesai / Closed</th>
                <th>Beban kerja aktif</th>
              </tr>
            </thead>
            <tbody>
              {team
                .filter(
                  (m) =>
                    (baseRole(user, roles) !== 'Agent' || m.id === user.id) &&
                    (baseRole(user, roles) === 'Agent' || !reportAgent || m.id === reportAgent)
                )
                .map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="member-cell">
                        <span className="avatar small color-0">
                          {m.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        {m.name}
                      </span>
                    </td>
                    <td>{roleLabel(m, roles)}</td>
                    <td>{reportTickets.filter((t) => t.agent === m.id).length}</td>
                    <td>{closed.filter((t) => t.agent === m.id).length}</td>
                    <td>
                      {
                        reportTickets.filter(
                          (t) => t.agent === m.id && !['Resolved', 'Closed'].includes(t.status)
                        ).length
                      }{' '}
                      tiket
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
