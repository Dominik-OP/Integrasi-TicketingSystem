'use client';
import type { Ticket } from '@/lib/demo';
import { date } from '@/lib/demo';
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
  projects: Project[];
  signIn: (email: string, password: string) => Promise<void>;
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
  projects,
  signIn,
  navigate,
  submitted,
  clearSubmitted,
  form,
  token,
  ready,
}: Props) {
  const [tracked, setTracked] = useState<Ticket | null>(null),
    [error, setError] = useState(''),
    [authBusy, setAuthBusy] = useState(false);
  useEffect(() => {
    setTracked(null);
    setError('');
  }, [view, token]);
  useEffect(() => {
    if (!token || view !== 'track') return;
    setError('');
    void fetch('/api/public/tracking', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTracked(data.ticket);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Link tidak tersedia.')
      );
  }, [token, view]);
  const ticket = tracked;
  const resolution = ticket?.resolution;
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
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setAuthBusy(true);
                setError('');
                try {
                  await signIn(String(fd.get('email')), String(fd.get('password')));
                  window.location.assign('/');
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : 'Proses masuk gagal.');
                } finally {
                  setAuthBusy(false);
                }
              }}
            >
              <div className="login-emblem">
                <LockKeyhole size={25} />
              </div>
              <h2>Masuk sebagai anggota tim</h2>
              <label>
                Email tim
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="Minimal 6 karakter"
                />
              </label>
              <p className="muted small-text">
                Pada setup fresh, email dan password pertama otomatis membuat akun Admin.
              </p>
              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <button className="primary" disabled={authBusy}>
                {authBusy ? 'Memproses…' : 'Masuk ke workspace'} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <>
              {!token && (
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    setError('');
                    const response = await fetch('/api/public/tracking', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ number: fd.get('number'), email: fd.get('email') }),
                    });
                    const data = await response.json();
                    setTracked(response.ok ? data.ticket : null);
                    setError(
                      response.ok ? '' : (data.error ?? 'Nomor tiket dan email tidak cocok.')
                    );
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
                </form>
              )}
              {token && !ticket && (
                <div className="success">
                  <Link2 size={35} />
                  <h2>{error || 'Memuat laporan…'}</h2>
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
                  {ticket.attachments.length > 0 && (
                    <section className="tracking-attachments">
                      <h3>Lampiran</h3>
                      {ticket.attachments.map((attachment, index) => (
                        <div className="attachment" key={index}>
                          <Link2 size={15} />
                          {attachment.url ? (
                            <a href={attachment.url} target="_blank" rel="noreferrer">
                              {attachment.name}
                            </a>
                          ) : (
                            attachment.name
                          )}
                        </div>
                      ))}
                    </section>
                  )}
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
