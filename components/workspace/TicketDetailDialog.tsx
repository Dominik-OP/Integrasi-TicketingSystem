'use client';
import TicketHistory from '@/components/ticket-history';
import { Dialog } from '@/components/ui';
import Select from '@/components/ui/Select';
import { date, statuses, type Category, type Member, type Status, type Ticket } from '@/lib/domain';
import {
  baseRole,
  canUpdateTicket,
  roleLabel,
  type Permission,
  type RoleDefinition,
} from '@/lib/permissions';
import type { Project } from '@/lib/projects';
import { ExternalLink, Paperclip, Send } from 'lucide-react';
import { useState } from 'react';

export default function TicketDetailDialog({
  ticket,
  user,
  roles,
  team,
  categories,
  projects,
  canManage,
  can,
  moveTicket,
  changeTicket,
  close,
}: {
  ticket: Ticket;
  user: Member;
  roles: RoleDefinition[];
  team: Member[];
  categories: Category[];
  projects: Project[];
  canManage: boolean;
  can: (permission: Permission) => boolean;
  moveTicket: (id: string, status: Status) => void;
  changeTicket: (id: string, patch: Partial<Ticket>, event: string) => void;
  close: () => void;
}) {
  const [commentVisibility, setCommentVisibility] = useState<'public' | 'internal'>('public');
  return (
    <Dialog title="Detail tiket" close={close}>
      <div className="detail-head">
        <span className="eyebrow">{ticket.id}</span>
        <h2>{ticket.title}</h2>
        <p className="muted">
          Dilaporkan oleh <strong>{ticket.name}</strong> · {date(ticket.created)}
        </p>
      </div>
      <div className="detail-fields">
        <label>
          Status
          <Select
            aria-label="Status tiket"
            value={ticket.status}
            disabled={!canUpdateTicket(user, roles, ticket)}
            onChange={(e) => moveTicket(ticket.id, e.target.value as Status)}
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
        <label>
          Kategori
          <Select
            aria-label="Kategori tiket"
            value={ticket.category}
            disabled={!canManage}
            onChange={(e) =>
              changeTicket(
                ticket.id,
                { category: e.target.value },
                `Kategori diubah menjadi ${e.target.value}`
              )
            }
          >
            <option value="Belum dikategorikan" disabled>
              Belum dikategorikan
            </option>
            {categories
              .filter((category) => category.active !== false || category.name === ticket.category)
              .map((category) => (
                <option key={category.id ?? category.name} value={category.name}>
                  {category.name}
                  {category.active === false ? ' (nonaktif)' : ''}
                </option>
              ))}
          </Select>
        </label>
        <label>
          Prioritas final · reviewer
          <Select
            value={ticket.priority}
            disabled={!canManage}
            onChange={(e) =>
              changeTicket(
                ticket.id,
                { priority: e.target.value },
                `Prioritas diubah menjadi ${e.target.value}`
              )
            }
          >
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </label>
        <label>
          Reviewer
          <Select
            value={ticket.reviewer}
            disabled={!canManage}
            onChange={(e) =>
              changeTicket(
                ticket.id,
                { reviewer: e.target.value },
                `Reviewer: ${team.find((m) => m.id === e.target.value)?.name ?? 'Belum ditugaskan'}`
              )
            }
          >
            <option value="">Belum ditugaskan</option>
            {team
              .filter((m) => m.active && baseRole(m, roles) !== 'Agent')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {roleLabel(m, roles)}
                </option>
              ))}
          </Select>
        </label>
        <label>
          Agent
          <Select
            aria-label="Agent tiket"
            value={ticket.agent}
            disabled={!canManage}
            onChange={(e) =>
              changeTicket(
                ticket.id,
                { agent: e.target.value },
                `Agent: ${team.find((m) => m.id === e.target.value)?.name ?? 'Belum ditugaskan'}`
              )
            }
          >
            <option value="">Belum ditugaskan</option>
            {team
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {roleLabel(m, roles)}
                </option>
              ))}
          </Select>
        </label>
      </div>
      <section className="detail-description">
        <div className="ticket-context">
          <span>
            Project <strong>{projects.find((p) => p.id === ticket.projectId)?.name}</strong>
          </span>
          <span>
            Dampak yang dilaporkan <strong>{ticket.impact || 'Tidak disebutkan'}</strong>
          </span>
        </div>
        <h3>Deskripsi laporan</h3>
        <p>{ticket.description}</p>
        <span className="category-tag">{ticket.category}</span>
        <span className="muted small-text"> {ticket.email}</span>
        {ticket.attachments.map((a, i) => (
          <div className="attachment" key={i}>
            <Paperclip size={15} />
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer">
                {a.name}
              </a>
            ) : (
              a.name
            )}
            <small>{a.url ? 'Lampiran tersimpan' : 'Tautan tidak tersedia'}</small>
          </div>
        ))}
      </section>
      {ticket.resolution && (
        <section className="resolution-card">
          <h3>Ringkasan penyelesaian</h3>
          <div>
            <strong>Penyebab masalah</strong>
            <p>{ticket.resolution.cause}</p>
          </div>
          <div>
            <strong>Perbaikan yang dilakukan</strong>
            <p>{ticket.resolution.fix}</p>
          </div>
          <div>
            <strong>Dampak / perubahan</strong>
            <p>{ticket.resolution.impact}</p>
          </div>
          <div>
            <strong>Langkah untuk pelapor</strong>
            <p>{ticket.resolution.reporterSteps}</p>
          </div>
          {ticket.resolution.internalNotes && (
            <div>
              <strong>Catatan internal</strong>
              <p>{ticket.resolution.internalNotes}</p>
            </div>
          )}
        </section>
      )}
      {ticket.closure && (
        <section className="resolution-card">
          <h3>Alasan penutupan</h3>
          <p>{ticket.closure.reason}</p>
          <small>
            {ticket.closure.author} · {date(ticket.closure.at)}
          </small>
        </section>
      )}
      {ticket.trackingToken && (
        <a
          className="text-button"
          href={`/track/${encodeURIComponent(ticket.trackingToken)}`}
          target="_blank"
          rel="noreferrer"
        >
          Buka halaman tracking pelapor <ExternalLink size={14} />
        </a>
      )}
      <h3>Diskusi tiket</h3>
      {ticket.comments.map((c, i) => (
        <div className={`comment ${c.internal ? 'internal' : ''}`} key={i}>
          <strong>
            {c.author} <span className="category-tag">{c.authorRole ?? 'Role belum tercatat'}</span>
          </strong>
          <small>
            {date(c.at)} · {c.internal ? 'Catatan internal' : 'Balasan publik'}
          </small>
          <p>{c.text}</p>
        </div>
      ))}
      {can('comment') && (
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const text = String(fd.get('message')).trim();
            if (!text) return;
            const internal = commentVisibility === 'internal';
            changeTicket(
              ticket.id,
              {
                comments: [
                  ...ticket.comments,
                  {
                    text,
                    at: new Date().toISOString(),
                    author: user.name,
                    authorRole: roleLabel(user, roles),
                    internal,
                  },
                ],
              },
              internal ? 'Catatan internal ditambahkan' : 'Balasan publik ditambahkan'
            );
            e.currentTarget.reset();
          }}
        >
          <textarea
            aria-label="Isi komentar"
            name="message"
            required
            rows={3}
            placeholder={
              commentVisibility === 'internal'
                ? 'Tulis catatan yang hanya terlihat oleh tim…'
                : 'Tulis balasan yang akan terlihat oleh pelapor…'
            }
          />
          <div>
            <Select
              name="visibility"
              aria-label="Visibilitas komentar"
              value={commentVisibility}
              onChange={(e) => setCommentVisibility(e.target.value as 'public' | 'internal')}
            >
              <option value="public">Balasan publik</option>
              <option value="internal">Catatan internal</option>
            </Select>
            <button className="primary">
              <Send size={14} /> Kirim
            </button>
          </div>
          <small className="muted">
            {commentVisibility === 'internal'
              ? 'Hanya anggota tim yang dapat melihat catatan ini. Tidak dikirim ke pelapor.'
              : 'Pelapor dapat melihat balasan ini melalui magic link tracking. Pada versi terintegrasi, notifikasi email akan dikirim.'}
          </small>
        </form>
      )}
      <h3>Aktivitas tiket</h3>
      <TicketHistory history={[...ticket.history].reverse()} />
    </Dialog>
  );
}
