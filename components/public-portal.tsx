'use client';
import Select from '@/components/ui/Select';
import type { Member, Ticket } from '@/lib/demo';
import { date } from '@/lib/demo';
import { roleLabel, type RoleDefinition } from '@/lib/permissions';
import type { Project } from '@/lib/projects';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Link2,
  LockKeyhole,
  Mail,
  Search,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from './preferences';
import TicketHistory from './ticket-history';

type Props = {
  view: string;
  tickets: Ticket[];
  projects: Project[];
  team: Member[];
  roles: RoleDefinition[];
  userId: string;
  setUserId: (id: string) => void;
  onLogin: () => void;
  navigate: (view: string) => void;
  submitted: Ticket | null;
  clearSubmitted: () => void;
  form: ReactNode;
  token: string;
  notify: (message: string) => void;
  ready: boolean;
};
export default function PublicPortal({
  view,
  tickets,
  projects,
  team,
  roles,
  userId,
  setUserId,
  onLogin,
  navigate,
  submitted,
  clearSubmitted,
  form,
  token,
  ready,
}: Props) {
  const [tracked, setTracked] = useState<string | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    setTracked(null);
    setError('');
  }, [view, token]);
  const tokenTicket = token ? tickets.find((t) => t.trackingToken === token) : undefined;
  const ticket = token ? tokenTicket : tickets.find((t) => t.id === tracked);
  const resolution = ticket?.resolution;
  const sample = tickets[0];
  const link = submitted?.trackingToken ? `/track/${submitted.trackingToken}` : '';
  const publicComments = ticket?.comments.filter((c) => !c.internal) ?? [];
  return (
    <div className="public-page">
      <header className="public-header">
        <button onClick={() => navigate('submit')} className="brand">
          <span className="brand-mark">
            i<span />
          </span>
          <span>
            integrasi<span className="brand-caption">TICKETING SYSTEM</span>
          </span>
        </button>
        <nav>
          <ThemeToggle />
          <button
            className={view === 'submit' ? 'public-active' : ''}
            onClick={() => navigate('submit')}
          >
            Buat laporan
          </button>
          <button
            className={view === 'track' ? 'public-active' : ''}
            onClick={() => navigate('track')}
          >
            Lacak tiket
          </button>
          <button className="outline" onClick={() => navigate('login')}>
            Masuk tim <ArrowUpRight size={14} />
          </button>
        </nav>
      </header>
      <main className="public-main">
        <span className="eyebrow">
          {view === 'login' ? 'INTEGRASI TEAM WORKSPACE' : 'INTEGRASI SUPPORT CENTER'}
        </span>
        <h1>
          {view === 'submit'
            ? 'Ada kendala? Kami siap membantu.'
            : view === 'track'
              ? 'Setiap laporan, selalu terpantau.'
              : 'Ruang kerja tim, satu pintu masuk.'}
        </h1>
        <p className="subtitle">
          {view === 'submit'
            ? 'Ceritakan kendala dan dampaknya. Kami bantu temukan solusinya.'
            : view === 'track'
              ? 'Buka link pribadi dari email atau gunakan nomor tiket dan email Anda.'
              : 'Masuk untuk meninjau, mendelegasikan, dan menyelesaikan laporan.'}
        </p>
        {view === 'submit' && !submitted && (
          <div className="public-benefits">
            <span>
              <CircleCheck size={14} /> Tanpa buat akun
            </span>
            <span>
              <Link2 size={14} /> Link tracking pribadi
            </span>
            <span>
              <Mail size={14} /> Progres via email
            </span>
          </div>
        )}
        <section className="public-card">
          {!ready ? (
            <p className="muted">Memuat data demo…</p>
          ) : view === 'submit' ? (
            submitted ? (
              <div className="success">
                <CircleCheck size={48} />
                <h2>Laporan berhasil dibuat!</h2>
                <p>
                  {projects.find((p) => p.id === submitted.projectId)?.name} · Simpan nomor laporan
                  Anda.
                </p>
                <code>{submitted.id}</code>
                <a className="primary link-button" href={link}>
                  Lihat progres tanpa login <ArrowRight size={16} />
                </a>
                <button onClick={clearSubmitted}>Buat laporan lain</button>
              </div>
            ) : (
              form
            )
          ) : view === 'login' ? (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                onLogin();
              }}
            >
              <div className="login-emblem">
                <LockKeyhole size={25} />
              </div>
              <h2>Masuk sebagai anggota tim</h2>
              <label>
                Akun demo
                <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                  {team
                    .filter((m) => m.active)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {roleLabel(m, roles)}
                      </option>
                    ))}
                </Select>
              </label>
              <button className="primary">
                Masuk ke workspace <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <>
              {!token && (
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const found = tickets.find(
                      (t) =>
                        t.id.toLowerCase() === String(fd.get('number')).trim().toLowerCase() &&
                        t.email.toLowerCase() === String(fd.get('email')).trim().toLowerCase()
                    );
                    setTracked(found?.id ?? null);
                    setError(found ? '' : 'Nomor tiket dan email tidak cocok.');
                  }}
                >
                  <label>
                    Nomor tiket
                    <input name="number" required />
                  </label>
                  <label>
                    Email pelapor
                    <input name="email" type="email" required />
                  </label>
                  {error && (
                    <p role="alert" className="error-text">
                      {error}
                    </p>
                  )}
                  <button className="primary">
                    <Search size={16} /> Lacak tiket
                  </button>
                  {sample && (
                    <p className="muted small-text">
                      Coba demo: {sample.id} · {sample.email}
                    </p>
                  )}
                </form>
              )}
              {token && !ticket && (
                <div className="success">
                  <Link2 size={35} />
                  <h2>Link tidak tersedia</h2>
                  <button className="outline" onClick={() => navigate('track')}>
                    <ArrowLeft size={15} /> Gunakan tracking manual
                  </button>
                </div>
              )}
              {ticket && (
                <div className="tracking-result">
                  <div className="tracking-access">
                    <CircleCheck size={15} />
                    {token ? 'Diakses melalui link pribadi' : 'Nomor tiket & email cocok'}
                  </div>
                  <span className="eyebrow">{ticket.id}</span>
                  <h2>{ticket.title}</h2>
                  <div className="tracking-meta">
                    <span className="category-tag">
                      {projects.find((p) => p.id === ticket.projectId)?.name}
                    </span>
                    <span className="category-tag">{ticket.category}</span>
                    <span className="tracking-status">{ticket.status}</span>
                  </div>
                  <div className="tracking-summary">
                    <span>
                      Pelapor<strong>{ticket.name}</strong>
                    </span>
                    <span>
                      Dibuat<strong>{date(ticket.created)}</strong>
                    </span>
                  </div>
                  {resolution && (
                    <section className="resolution-card">
                      <h3>Penyelesaian</h3>
                      <div>
                        <strong>Penyebab masalah</strong>
                        <p>{resolution.cause}</p>
                      </div>
                      <div>
                        <strong>Perbaikan yang dilakukan</strong>
                        <p>{resolution.fix}</p>
                      </div>
                      <div>
                        <strong>Dampak / perubahan</strong>
                        <p>{resolution.impact}</p>
                      </div>
                      <div>
                        <strong>Langkah untuk pelapor</strong>
                        <p>{resolution.reporterSteps}</p>
                      </div>
                      <small>
                        Dijelaskan oleh {resolution.author} · {resolution.authorRole} ·{' '}
                        {date(resolution.at)}
                      </small>
                    </section>
                  )}
                  <h3>Riwayat laporan</h3>
                  <TicketHistory history={ticket.history.filter((h) => !h.internal)} />
                  <h3>Balasan tim</h3>
                  {publicComments.length ? (
                    publicComments.map((c, i) => (
                      <div className="comment" key={i}>
                        <strong>
                          {c.author}{' '}
                          <span className="category-tag">
                            {c.authorRole ?? 'Role belum tercatat'}
                          </span>
                        </strong>
                        <small>{date(c.at)}</small>
                        <p>{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="public-empty">
                      <Mail size={20} />
                      <p>Belum ada balasan. Tim support akan memperbarui progres di sini.</p>
                    </div>
                  )}
                  <p className="muted small-text">
                    Catatan internal tim tidak ditampilkan pada halaman ini.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
        <p className="public-foot">
          Integrasi - Ticketing System <span>·</span> Satu tempat untuk setiap solusi.
        </p>
      </main>
    </div>
  );
}
