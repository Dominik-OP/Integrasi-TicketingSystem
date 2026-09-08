'use client';
import Select from '@/components/ui/Select';
import type { Member, Role, Ticket } from '@/lib/demo';
import { defaults, permissionList, type Permission, type RoleDefinition } from '@/lib/permissions';
import { dayKey, nextTicketNumber, type Project } from '@/lib/projects';
import { ArrowRight, Check, Layers3, Plus, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useAccessLabels } from '../preferences';
import AccessLevelNames from './access-level-names';

export function ProjectSettings({
  projects,
  tickets,
  onSave,
  notify,
}: {
  projects: Project[];
  tickets: Ticket[];
  onSave: (projects: Project[]) => void;
  notify: (text: string) => void;
}) {
  const [draft, setDraft] = useState<Project | null>(null);
  function save() {
    if (!draft) return;
    const name = draft.name.trim(),
      prefix = draft.prefix.trim().toUpperCase();
    if (!name || !/^[A-Z]{2,8}$/.test(prefix)) {
      notify('Isi nama project dan prefix 2–8 huruf A–Z.');
      return;
    }
    if (
      projects.some(
        (p) =>
          p.id !== draft.id && (p.prefix === prefix || p.name.toLowerCase() === name.toLowerCase())
      )
    ) {
      notify('Nama project atau prefix sudah digunakan.');
      return;
    }
    const data = { ...draft, name, prefix };
    onSave(
      projects.some((p) => p.id === data.id)
        ? projects.map((p) => (p.id === data.id ? data : p))
        : [...projects, data]
    );
    setDraft(null);
    notify('Project berhasil disimpan. Nomor tiket lama tetap sama.');
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Project & ticket prefix</h2>
          <p>Nomor berbeda untuk setiap produk. Satu ruang kerja yang terhubung.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: '',
              prefix: '',
              description: '',
              active: true,
            })
          }
        >
          <Plus size={16} /> Tambah project
        </button>
      </div>
      <div className="project-grid">
        {projects.map((p) => (
          <article className="project-card" key={p.id}>
            <div className="project-card-top">
              <span className="project-icon">
                <Layers3 size={21} />
              </span>
              <span className={`member-status ${p.active ? '' : 'inactive'}`}>
                {p.active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <h3>{p.name}</h3>
            <p>{p.description || 'Belum ada deskripsi project.'}</p>
            <div className="prefix-preview">
              <span>Nomor tiket berikutnya</span>
              <code>{nextTicketNumber(p, tickets)}</code>
            </div>
            <div className="project-public-link">
              <span>Link laporan untuk pengguna</span>
              <a href={`/submit/${encodeURIComponent(p.id)}`} target="_blank" rel="noreferrer">
                /submit/{p.id} ↗
              </a>
              <button
                type="button"
                className="text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/submit/${encodeURIComponent(p.id)}`
                    );
                    notify('Link laporan disalin.');
                  } catch {
                    notify('Buka link laporan lalu salin alamatnya dari browser.');
                  }
                }}
              >
                Salin link
              </button>
            </div>
            <footer>
              <span>{tickets.filter((t) => t.projectId === p.id).length} tiket</span>
              <button className="text-button" onClick={() => setDraft({ ...p })}>
                Edit project <ArrowRight size={14} />
              </button>
            </footer>
          </article>
        ))}
      </div>
      <div className="info-box">
        <Layers3 size={20} />
        <p>
          Format <strong>PREFIX–YYYYMMDD–0001</strong>. Nomor urut dimulai dari 0001 setiap hari
          untuk masing-masing project, mengikuti waktu Jakarta. Kategori dan role digunakan bersama.
        </p>
      </div>
      {draft && (
        <section className="panel editor-panel">
          <header>
            <h2>{projects.some((p) => p.id === draft.id) ? 'Edit project' : 'Project baru'}</h2>
            <button aria-label="Tutup editor project" onClick={() => setDraft(null)}>
              <X size={18} />
            </button>
          </header>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="form-row">
              <label>
                Nama project
                <input
                  required
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={80}
                />
              </label>
              <label>
                Prefix tiket
                <input
                  required
                  pattern="[A-Z]{2,8}"
                  maxLength={8}
                  value={draft.prefix}
                  onChange={(e) => setDraft({ ...draft, prefix: e.target.value.toUpperCase() })}
                  placeholder="APP"
                />
              </label>
            </div>
            <label>
              Deskripsi project
              <input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                maxLength={180}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />{' '}
              Project aktif untuk laporan baru
            </label>
            <div className="prefix-preview">
              <span>Preview format</span>
              <code>
                {draft.prefix || 'PREFIX'}-{dayKey()}-0001
              </code>
            </div>
            <p className="muted small-text">
              Perubahan prefix hanya berlaku untuk tiket baru. Project nonaktif tetap tersedia pada
              riwayat dan filter.
            </p>
            <button className="primary">
              <Check size={16} /> Simpan project
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export function RoleSettings({
  roles,
  team,
  currentUser,
  onSave,
  notify,
}: {
  roles: RoleDefinition[];
  team: Member[];
  currentUser: Member;
  onSave: (roles: RoleDefinition[]) => void;
  notify: (text: string) => void;
}) {
  const [draft, setDraft] = useState<RoleDefinition | null>(null);
  const { labels } = useAccessLabels();
  return (
    <>
      <AccessLevelNames notify={notify} />
      <div className="section-heading">
        <div>
          <h2>Role & hak akses</h2>
          <p>Jabatan untuk identitas tim, izin untuk menentukan tanggung jawab.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: '',
              base: 'Agent',
              permissions: defaults('Agent'),
            })
          }
        >
          <Plus size={16} /> Tambah role
        </button>
      </div>
      <div className="role-summary">
        {roles.map((r) => (
          <button key={r.id} onClick={() => setDraft({ ...r, permissions: { ...r.permissions } })}>
            <ShieldCheck size={20} />
            <strong>{r.name}</strong>
            <small>
              {labels[r.base]} · {team.filter((m) => m.roleId === r.id).length} anggota
            </small>
            <span>
              Edit role <ArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
      <section className="panel">
        <h2>Permission matrix</h2>
        <p className="muted">
          Default setiap role. Pengecualian individu dapat diatur melalui Anggota tim → Edit
          anggota.
        </p>
        <div className="table-wrap permission-matrix">
          <table>
            <thead>
              <tr>
                <th>Hak akses</th>
                {roles.map((r) => (
                  <th key={r.id}>
                    {r.name}
                    <small>{labels[r.base]}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionList.map((p) => (
                <tr key={p.key}>
                  <td>
                    <strong>{p.label}</strong>
                    <small>{p.note}</small>
                  </td>
                  {roles.map((r) => (
                    <td key={r.id}>
                      {r.permissions[p.key] ? (
                        <span className="permission-yes">
                          <Check size={15} />
                          {r.base === 'Agent' && ['update_status', 'view_reports'].includes(p.key)
                            ? 'Milik sendiri'
                            : 'Diizinkan'}
                        </span>
                      ) : (
                        <span className="permission-no">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {draft && (
        <section className="panel editor-panel">
          <header>
            <h2>{roles.some((r) => r.id === draft.id) ? 'Edit role' : 'Role baru'}</h2>
            <button aria-label="Tutup editor role" onClick={() => setDraft(null)}>
              <X size={18} />
            </button>
          </header>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const name = draft.name.trim();
              if (!name) return;
              if (
                roles.some((r) => r.id !== draft.id && r.name.toLowerCase() === name.toLowerCase())
              ) {
                notify('Nama role sudah digunakan.');
                return;
              }
              if (
                draft.id === currentUser.roleId &&
                (draft.base !== 'Admin' ||
                  !draft.permissions.manage_roles ||
                  !draft.permissions.manage_users)
              ) {
                notify(
                  'Role Admin yang sedang digunakan harus tetap dapat mengelola role dan anggota.'
                );
                return;
              }
              onSave(
                roles.some((r) => r.id === draft.id)
                  ? roles.map((r) => (r.id === draft.id ? { ...draft, name } : r))
                  : [...roles, { ...draft, name }]
              );
              setDraft(null);
              notify('Role dan permission matrix berhasil disimpan.');
            }}
          >
            <div className="form-row">
              <label>
                Nama role / jabatan
                <input
                  autoFocus
                  required
                  maxLength={50}
                  placeholder="Contoh: Quality Assurance"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Level akses
                <Select
                  value={draft.base}
                  onChange={(e) => {
                    const base = e.target.value as Role;
                    setDraft({ ...draft, base, permissions: defaults(base) });
                  }}
                >
                  {(['Agent', 'Reviewer', 'Admin'] as Role[]).map((level) => (
                    <option key={level} value={level}>
                      {labels[level]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <p className="muted small-text">
              Mengganti level akses akan memuat ulang izin default. Level pelaksana hanya dapat
              memperbarui status tiket assigned dan melihat analitik miliknya.
            </p>
            <div className="permission-options">
              {permissionList.map((p) => (
                <label key={p.key}>
                  <span>
                    <strong>{p.label}</strong>
                    <small>{p.note}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.permissions[p.key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        permissions: { ...draft.permissions, [p.key]: e.target.checked },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <button className="primary">
              <Check size={16} /> Simpan role
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export function PermissionOverrides({
  roles,
  initialRoleId,
  initialOverrides,
}: {
  roles: RoleDefinition[];
  initialRoleId?: string;
  initialOverrides?: Partial<Record<Permission, boolean>>;
}) {
  const [roleId, setRoleId] = useState(initialRoleId ?? 'agent');
  const role = roles.find((r) => r.id === roleId);
  const { labels } = useAccessLabels();
  return (
    <>
      <label>
        Role / jabatan
        <Select name="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {labels[r.base]}
            </option>
          ))}
        </Select>
      </label>
      <div className="override-heading">
        <h3>Pengecualian hak akses</h3>
        <p>Izin individu mengutamakan pilihan ini. Gunakan default untuk mengikuti role.</p>
      </div>
      <div className="override-options">
        {permissionList.map((p) => (
          <label key={p.key}>
            <span>
              {p.label}
              <small>
                Default {role?.name}: {role?.permissions[p.key] ? 'diizinkan' : 'tidak diizinkan'}
              </small>
            </span>
            <Select
              aria-label={`Override ${p.label}`}
              name={`override:${p.key}`}
              defaultValue={
                initialOverrides?.[p.key] === undefined
                  ? 'default'
                  : initialOverrides[p.key]
                    ? 'allow'
                    : 'deny'
              }
            >
              <option value="default">Ikuti role</option>
              <option value="allow">Izinkan</option>
              <option value="deny">Tolak</option>
            </Select>
          </label>
        ))}
      </div>
    </>
  );
}
