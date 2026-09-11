'use client';
import BoardView from '@/components/board/BoardView';
import ReportsView from '@/components/reports/ReportsView';
import SettingsView from '@/components/settings/SettingsView';
import TeamView from '@/components/team/TeamView';
import TicketsView from '@/components/tickets/TicketsView';
import { Dialog, Empty } from '@/components/ui';
import Select from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/hooks/useFilters';
import { useReports } from '@/hooks/useReports';
import { useTickets } from '@/hooks/useTickets';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import {
  date,
  initials,
  statuses,
  type Category,
  type Member,
  type Status,
  type Ticket,
} from '@/lib/domain';
import {
  baseRole,
  canUpdateTicket,
  canViewTicket,
  permissionList,
  roleLabel,
} from '@/lib/permissions';
import {
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Download,
  ExternalLink,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Paperclip,
  Search,
  Send,
  Settings,
  Tickets,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TicketForm from './forms/ticket-form';
import { ThemeToggle, useAccessLabels } from './preferences';
import PublicPortal from './public-portal';
import { PermissionOverrides } from './settings/master-data';
import TicketHistory from './ticket-history';
import WorkspaceSwitcher from './workspace-switcher';

const nav = [
  { id: 'board', label: 'Papan tiket', icon: LayoutDashboard },
  { id: 'tickets', label: 'Semua tiket', icon: Tickets },
  { id: 'reports', label: 'Analitik & laporan', icon: ChartNoAxesCombined },
  { id: 'team', label: 'Anggota tim', icon: Users },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];
const titleMap: Record<string, string> = {
  board: 'Papan tiket',
  tickets: 'Semua tiket',
  reports: 'Analitik & laporan',
  team: 'Anggota tim',
  settings: 'Pengaturan',
};

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? 'small' : ''} color-${name.length % 4}`}>
      {initials(name)}
    </span>
  );
}

export default function Workspace({
  initialView = 'board',
  initialToken = '',
  initialSettings = 'categories',
  initialPublicProject = 'app',
}: {
  initialView?: string;
  initialToken?: string;
  initialSettings?: string;
  initialPublicProject?: string;
}) {
  const [requestedView, setView] = useState(initialView);
  const [projectId, setProjectId] = useState('');
  const [settingsTab, setSettingsTab] = useState(initialSettings);
  const [selected, setSelected] = useState<string | null>(null);
  const [memberEdit, setMemberEdit] = useState<Member | null | undefined>(undefined);
  const [categoryEdit, setCategoryEdit] = useState<Category | null | undefined>(undefined);
  const [resolutionEdit, setResolutionEdit] = useState<string | null>(null);
  const [closureEdit, setClosureEdit] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Ticket | null>(null);
  const [publicProjectId, setPublicProjectId] = useState(initialPublicProject);
  const [period, setPeriod] = useState('30');
  const [reportAgent, setReportAgent] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'public' | 'internal'>('public');
  const { labels } = useAccessLabels();
  const [token, setToken] = useState(initialToken);
  const [toast, setToast] = useState('');
  const [creating, setCreating] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const {
    team,
    accessRequests,
    categories,
    projects,
    roles,
    tickets,
    setTickets,
    ready,
    reload,
    saveProject,
    saveMember,
    saveCategory,
    saveRole,
  } = useWorkspaceData(setToast);

  const {
    user,
    signedIn,
    accessStatus,
    authLoading,
    can,
    canManage,
    canSettings,
    signIn,
    signOut,
  } = useAuth(team, roles, ready);

  const { changeTicket, moveTicket } = useTickets(
    team,
    tickets,
    setTickets,
    ready,
    projects,
    categories,
    roles,
    user.id,
    setToast,
    setResolutionEdit,
    setClosureEdit,
    reload
  );

  const visibleTickets = tickets.filter(
    (t) => canViewTicket(user, roles, t) && (!projectId || t.projectId === projectId)
  );

  const activeTicket = selected ? visibleTickets.find((t) => t.id === selected) : null;

  const {
    filters,
    setQuery,
    setPriority,
    setCategory,
    setAgent,
    setStatusFilter,
    setMine,
    resetFilters,
    filteredTickets,
  } = useFilters(visibleTickets, user);

  const reportsData = useReports(
    visibleTickets,
    team,
    roles,
    user,
    categories,
    projects,
    period,
    reportAgent
  );

  function navigate(next: string) {
    setMobileOpen(false);
    setNotificationsOpen(false);
    const targetProject = ['submit', 'track', 'login'].includes(next)
      ? (tickets.find((t) => t.trackingToken === token)?.projectId ?? publicProjectId)
      : projectId || 'app';
    if (next === 'submit') {
      setPublicProjectId(targetProject);
      setSubmitted(null);
    }
    setSelected(null);
    setCreating(false);
    setToken('');
    setView(next);
    window.history.pushState(
      {},
      '',
      next === 'board'
        ? '/'
        : next === 'submit'
          ? `/submit/${encodeURIComponent(targetProject)}`
          : `/${next}`
    );
  }

  function navigateSettings(next: string) {
    setMobileOpen(false);
    setSettingsTab(next);
    setView('settings');
    window.history.pushState({}, '', `/settings/${next}`);
  }

  useEffect(() => {
    const pop = () => {
      const parts = window.location.pathname.split('/');
      setView(
        parts[1] === 'analytics' ? 'reports' : parts[1] === 'members' ? 'team' : parts[1] || 'board'
      );
      setToken(parts[1] === 'track' ? (parts[2] ?? '') : '');
      if (parts[1] === 'submit') {
        setPublicProjectId(decodeURIComponent(parts[2] ?? 'app'));
        setSubmitted(null);
      }
      if (parts[1] === 'settings') setSettingsTab(parts[2] ?? 'categories');
      setSelected(null);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  const view =
    !signedIn && !['submit', 'track', 'login'].includes(requestedView) ? 'login' : requestedView;
  const publicView = ['submit', 'track', 'login'].includes(view);

  const activeWorkspace = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const ticketForm = () => (
    <TicketForm
      categories={categories}
      projects={projects}
      projectId={view === 'submit' ? publicProjectId : projectId}
      publicForm={view === 'submit'}
      submitting={ticketSubmitting}
      onSubmit={async (e) => {
        e.preventDefault();
        if (ticketSubmitting) return;
        const fd = new FormData(e.currentTarget);
        const files = fd
          .getAll('attachments')
          .filter((f): f is File => f instanceof File && !!f.name);
        const project = projects.find(
          (p) => p.id === (view === 'submit' ? publicProjectId : fd.get('project')) && p.active
        );
        const chosenCategory = categories.find(
          (c) => c.name === fd.get('category') && c.active !== false
        );
        if (!project || (view !== 'submit' && !chosenCategory)) return;
        if (
          !['title', 'description', 'name', 'email'].every((key) =>
            String(fd.get(key) ?? '').trim()
          )
        ) {
          setToast('Lengkapi data laporan.');
          return;
        }
        if (
          files.some(
            (file) =>
              file.size > 5 * 1024 * 1024 ||
              !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)
          )
        ) {
          setToast('Lampiran harus PNG, JPG, WebP, atau PDF maksimal 5 MB per file.');
          return;
        }
        fd.set('project', project.id);
        setTicketSubmitting(true);
        try {
          const response = await fetch('/api/public/tickets', {
            method: 'POST',
            headers: { 'idempotency-key': crypto.randomUUID() },
            body: fd,
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error ?? 'Laporan gagal disimpan.');
          const newTicket: Ticket = result.ticket;
          if (result.attachmentWarning) setToast(result.attachmentWarning);
          if (view === 'submit') setSubmitted(newTicket);
          else {
            setCreating(false);
            setProjectId(project.id);
            setSelected(newTicket.id);
            await reload();
            setToast('Tiket berhasil dibuat.');
          }
        } catch (error) {
          setToast(error instanceof Error ? error.message : 'Laporan gagal disimpan.');
        } finally {
          setTicketSubmitting(false);
        }
      }}
    />
  );

  const exportCSV = () => {
    if (!can('export_reports')) return;
    const rows = [
      [
        'Nomor tiket',
        'Project',
        'Judul',
        'Kategori',
        'Prioritas',
        'Status',
        'Agent',
        'Role agent',
        'Reviewer',
        'Role reviewer',
        'Dibuat',
      ],
      ...(view === 'reports' ? reportsData.reportTickets : filteredTickets).map((t) => [
        t.id,
        projects.find((p) => p.id === t.projectId)?.name ?? '',
        t.title,
        t.category,
        t.priority,
        t.status,
        team.find((m) => m.id === t.agent)?.name ?? '',
        team.find((m) => m.id === t.agent)
          ? roleLabel(
              team.find((m) => m.id === t.agent)!,
              roles
            )
          : '',
        team.find((m) => m.id === t.reviewer)?.name ?? '',
        team.find((m) => m.id === t.reviewer)
          ? roleLabel(
              team.find((m) => m.id === t.reviewer)!,
              roles
            )
          : '',
        t.created,
      ]),
    ];
    const blob = new Blob(
      [
        '\uFEFF' +
          rows
            .map((r) =>
              r
                .map((v) => '"' + (/^[=+\-@]/.test(v) ? "'" : '') + v.replaceAll('"', '""') + '"')
                .join(',')
            )
            .join('\r\n'),
      ],
      { type: 'text/csv;charset=utf-8;' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'integrasi-laporan.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready || authLoading)
    return (
      <div role="status" className="empty">
        <LoaderCircle className="loading-spinner" size={24} /> Memuat workspace…
      </div>
    );

  if (publicView) {
    return (
      <>
        <PublicPortal
          view={view}
          projects={projects}
          signIn={signIn}
          accessStatus={accessStatus}
          navigate={navigate}
          submitted={submitted}
          clearSubmitted={() => setSubmitted(null)}
          form={ticketForm()}
          token={token}
          notify={setToast}
          ready={ready}
        />
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button aria-label="Tutup notifikasi" onClick={() => setToast('')}>
              <X size={15} />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="app-shell">
        {mobileOpen && (
          <button
            className="sidebar-scrim"
            aria-label="Tutup menu navigasi"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
          <Link href="/" className="brand">
            <span className="brand-mark">
              i<span />
            </span>
            <span>
              integrasi<span className="brand-caption">TICKETING SYSTEM</span>
            </span>
          </Link>
          <WorkspaceSwitcher
            projects={projects}
            value={projectId}
            onChange={(id) => {
              setProjectId(id);
            }}
            {...(can('manage_projects') ? { onManage: () => navigateSettings('projects') } : {})}
          />
          <span className="nav-label">WORKSPACE</span>
          <nav>
            {nav
              .filter((n) =>
                n.id === 'settings'
                  ? canSettings
                  : n.id === 'team'
                    ? can('manage_users') || can('manage_roles')
                    : n.id === 'reports'
                      ? can('view_reports')
                      : true
              )
              .map((n) => (
                <button
                  key={n.id}
                  className={view === n.id ? 'active' : ''}
                  onClick={() => navigate(n.id)}
                >
                  <n.icon size={19} />
                  <span>{n.label}</span>
                  {n.id === 'board' && (
                    <span className="nav-count">
                      {visibleTickets.filter((t) => t.status !== 'Closed').length}
                    </span>
                  )}
                </button>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card">
              <span className="help-icon">
                <CircleHelp size={20} />
              </span>
              <strong>Support yang lebih terhubung.</strong>
              <p>Bagikan portal bantuan agar setiap kendala punya solusi.</p>
              <button onClick={() => navigate('track')}>
                <Search size={18} /> Lacak tiket publik <ExternalLink size={13} />
              </button>
            </div>
            <div className="profile">
              <Avatar name={user.name} />
              <div>
                <strong>{user.name.split(' ')[0]}</strong>
                <small>{roleLabel(user, roles)}</small>
              </div>
              <button
                title="Keluar"
                onClick={async () => {
                  await signOut();
                  navigate('login');
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="mobile-toggle"
              aria-label="Buka menu navigasi"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{titleMap[view] ?? 'Papan tiket'}</strong>
            </div>
            <div className="topbar-right">
              <ThemeToggle />
              <button
                className="notification-button"
                aria-label="Notifikasi"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell size={19} />
                {reportsData.overdue.length > 0 && <i />}
              </button>
              <div className="active-workspace" aria-label="Workspace aktif">
                <span className="active-workspace-symbol">
                  {activeWorkspace ? (
                    <>{activeWorkspace.prefix.slice(0, 2)}</>
                  ) : (
                    <Layers3 size={15} />
                  )}
                </span>
                <span className="active-workspace-name">
                  {activeWorkspace?.name ?? 'Semua project'}
                </span>
              </div>
            </div>
          </header>
          <main className="main-content">
            <div className="page-heading">
              <div>
                <div className="overline">SUPPORT WORKSPACE</div>
                <h1>{titleMap[view] ?? 'Papan tiket'}</h1>
                <p>
                  {view === 'board'
                    ? 'Setiap tiket punya cerita. Mari selesaikan bersama.'
                    : view === 'tickets'
                      ? 'Semua laporan dan progresnya, dalam satu tempat.'
                      : view === 'reports'
                        ? 'Pahami performa tim. Bangun layanan yang lebih baik.'
                        : view === 'team'
                          ? 'Orang-orang di balik setiap solusi.'
                          : 'Sesuaikan alur support dengan kebutuhan tim Anda.'}
                </p>
              </div>
              {view === 'board' && (
                <button className="primary" onClick={() => setCreating(true)}>
                  Buat tiket
                </button>
              )}
              {['reports', 'tickets'].includes(view) && can('export_reports') && (
                <button className="outline" onClick={exportCSV}>
                  <Download size={16} /> Ekspor laporan
                </button>
              )}
            </div>

            {view === 'reports' && !can('view_reports') && (
              <Empty text="Anda tidak memiliki akses ke laporan." />
            )}

            {view === 'board' && (
              <BoardView
                filteredTickets={filteredTickets}
                visibleTickets={visibleTickets}
                team={team}
                roles={roles}
                projects={projects}
                categories={categories}
                user={user}
                onCreate={() => setCreating(true)}
                onSelect={setSelected}
                moveTicket={moveTicket}
                canManage={canManage}
                can={can}
                overdueCount={reportsData.overdue.length}
                filterControls={{
                  categories,
                  team,
                  roles,
                  view,
                  setView: navigate,
                  filters,
                  setQuery,
                  setPriority,
                  setCategory,
                  setAgent,
                  setStatusFilter,
                  resetFilters,
                }}
                setMine={setMine}
              />
            )}

            {view === 'tickets' && (
              <TicketsView
                filteredTickets={filteredTickets}
                visibleTickets={visibleTickets}
                team={team}
                roles={roles}
                projects={projects}
                categories={categories}
                user={user}
                view={view}
                setView={navigate}
                onCreate={() => setCreating(true)}
                onSelect={setSelected}
                canExport={can('export_reports')}
                exportCSV={exportCSV}
                filters={filters}
                setQuery={setQuery}
                setPriority={setPriority}
                setCategory={setCategory}
                setAgent={setAgent}
                setStatusFilter={setStatusFilter}
                setMine={setMine}
                resetFilters={resetFilters}
                canViewAll={can('view_all')}
              />
            )}

            {view === 'reports' && can('view_reports') && (
              <ReportsView
                reportTickets={reportsData.reportTickets}
                closed={reportsData.closed}
                reviewed={reportsData.reviewed}
                overdue={reportsData.overdue}
                frt={reportsData.frt}
                resolution={reportsData.resolution}
                compliance={reportsData.compliance}
                reopenRate={reportsData.reopenRate}
                team={team}
                roles={roles}
                projects={projects}
                categories={categories}
                user={user}
                period={period}
                setPeriod={setPeriod}
                reportAgent={reportAgent}
                setReportAgent={setReportAgent}
                canExport={can('export_reports')}
                exportCSV={exportCSV}
              />
            )}

            {view === 'team' && (
              <TeamView
                team={team}
                accessRequests={accessRequests}
                roles={roles}
                tickets={tickets}
                categories={categories}
                projects={projects}
                user={user}
                canManageUsers={can('manage_users')}
                canManageRoles={can('manage_roles')}
                onEditMember={setMemberEdit}
                onReviewAccess={async (request, decision, roleId) => {
                  const response = await fetch(
                    `/api/team/access-requests/${encodeURIComponent(request.userId)}`,
                    {
                      method: 'PATCH',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ decision, roleId }),
                    }
                  );
                  const data = await response.json();
                  if (!response.ok) {
                    const message = data.error ?? 'Permintaan akses gagal diperbarui.';
                    setToast(message);
                    throw new Error(message);
                  }
                  await reload();
                  setToast(
                    decision === 'approve'
                      ? `${request.name} disetujui sebagai anggota tim.`
                      : `Permintaan ${request.name} ditolak.`
                  );
                }}
                labels={labels}
              />
            )}

            {view === 'settings' && (
              <SettingsView
                settingsTab={settingsTab}
                navigateSettings={navigateSettings}
                projects={projects}
                tickets={tickets}
                roles={roles}
                team={team}
                categories={categories}
                user={user}
                onSaveProject={saveProject}
                onSaveRole={saveRole}
                notify={setToast}
                canManageCategories={can('manage_categories')}
                canManageRoles={can('manage_roles')}
                canManageProjects={can('manage_projects')}
                onEditCategory={setCategoryEdit}
              />
            )}
          </main>
        </div>
      </div>

      {creating && (
        <Dialog title="Buat tiket" close={() => setCreating(false)}>
          {ticketForm()}
        </Dialog>
      )}
      {notificationsOpen && (
        <Dialog title="Tiket membutuhkan perhatian" close={() => setNotificationsOpen(false)}>
          {reportsData.overdue.length ? (
            <div className="attention-list">
              {reportsData.overdue.map((ticket) => (
                <button
                  key={ticket.id}
                  className="outline"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setSelected(ticket.id);
                  }}
                >
                  <span>
                    <strong>{ticket.id}</strong>
                    <br />
                    {ticket.title}
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <Empty text="Tidak ada tiket yang melewati SLA." />
          )}
        </Dialog>
      )}

      {memberEdit !== undefined && (
        <Dialog
          title={memberEdit ? 'Edit anggota' : 'Tambah anggota'}
          close={() => setMemberEdit(undefined)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (memberSaving) return;
              const fd = new FormData(e.currentTarget);
              const data: Member = {
                id: memberEdit?.id ?? crypto.randomUUID(),
                name: String(fd.get('name')).trim(),
                email: String(fd.get('email')).trim().toLowerCase(),
                role: can('manage_roles')
                  ? (roles.find((r) => r.id === fd.get('roleId'))?.base ?? 'Agent')
                  : (memberEdit?.role ?? 'Agent'),
                roleId: can('manage_roles')
                  ? String(fd.get('roleId') ?? 'agent')
                  : (memberEdit?.roleId ?? 'agent'),
                overrides: can('manage_roles')
                  ? Object.fromEntries(
                      permissionList
                        .filter((p) => fd.get(`override:${p.key}`) !== 'default')
                        .map((p) => [p.key, fd.get(`override:${p.key}`) === 'allow'])
                    )
                  : (memberEdit?.overrides ?? {}),
                active: can('manage_users')
                  ? fd.get('active') === 'on'
                  : (memberEdit?.active ?? true),
              };
              setMemberSaving(true);
              try {
                await saveMember(data);
                setMemberEdit(undefined);
                setToast('Anggota tim berhasil disimpan ke backend.');
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Anggota gagal disimpan.');
              } finally {
                setMemberSaving(false);
              }
            }}
          >
            <label>
              Nama lengkap
              <input
                name="name"
                required
                readOnly={!can('manage_users')}
                defaultValue={memberEdit?.name}
              />
            </label>
            <label>
              Email
              <input name="email" type="email" required readOnly defaultValue={memberEdit?.email} />
              <small>
                Email login mengikuti akun terverifikasi dan tidak diubah dari halaman ini.
              </small>
            </label>
            {can('manage_roles') ? (
              <PermissionOverrides
                roles={roles}
                initialRoleId={memberEdit?.roleId ?? 'agent'}
                initialOverrides={memberEdit?.overrides ?? {}}
              />
            ) : (
              <p className="muted small-text">
                Role: {memberEdit ? roleLabel(memberEdit, roles) : 'Agent'}. Izin kelola role
                diperlukan untuk mengubah jabatan dan hak akses.
              </p>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                name="active"
                disabled={!can('manage_users')}
                defaultChecked={memberEdit?.active ?? true}
              />{' '}
              Anggota aktif
            </label>
            <button className="primary" type="submit" disabled={memberSaving}>
              {memberSaving ? (
                <LoaderCircle className="loading-spinner" size={16} />
              ) : (
                <Check size={16} />
              )}{' '}
              {memberSaving ? 'Menyimpan…' : 'Simpan anggota'}
            </button>
          </form>
        </Dialog>
      )}

      {categoryEdit !== undefined && (
        <Dialog
          title={categoryEdit ? 'Edit kategori & SLA' : 'Tambah kategori'}
          close={() => setCategoryEdit(undefined)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (categorySaving) return;
              const fd = new FormData(e.currentTarget);
              const data: Category = {
                name: String(fd.get('name')).trim(),
                priority: String(fd.get('priority')),
                response: Number(fd.get('response')),
                resolution: Number(fd.get('resolution')),
                active: fd.get('active') === 'on',
              };
              if (
                categories.some(
                  (c) =>
                    c.name.toLowerCase() === data.name.toLowerCase() &&
                    c.name !== categoryEdit?.name
                )
              ) {
                setToast('Nama kategori sudah digunakan.');
                return;
              }
              if (data.resolution < data.response) {
                setToast('Target penyelesaian harus sama atau lebih besar dari target respons.');
                return;
              }
              setCategorySaving(true);
              try {
                await saveCategory({
                  ...data,
                  ...(categoryEdit?.id ? { id: categoryEdit.id } : {}),
                });
                setCategoryEdit(undefined);
                setToast('Kategori dan aturan SLA disimpan ke backend.');
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Kategori gagal disimpan.');
              } finally {
                setCategorySaving(false);
              }
            }}
          >
            <label>
              Nama kategori
              <input name="name" required defaultValue={categoryEdit?.name} />
            </label>
            <label>
              Prioritas default
              <Select name="priority" defaultValue={categoryEdit?.priority ?? 'Medium'}>
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </label>
            <div className="form-row">
              <label>
                Respons (jam)
                <input
                  name="response"
                  type="number"
                  min="1"
                  max="720"
                  required
                  defaultValue={categoryEdit?.response ?? 2}
                />
              </label>
              <label>
                Penyelesaian (jam)
                <input
                  name="resolution"
                  type="number"
                  min="1"
                  max="2160"
                  required
                  defaultValue={categoryEdit?.resolution ?? 24}
                />
              </label>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={categoryEdit?.active !== false}
              />{' '}
              Kategori aktif pada form laporan
            </label>
            <button className="primary" type="submit" disabled={categorySaving}>
              {categorySaving ? (
                <LoaderCircle className="loading-spinner" size={16} />
              ) : (
                <Check size={16} />
              )}{' '}
              {categorySaving ? 'Menyimpan…' : 'Simpan aturan'}
            </button>
          </form>
        </Dialog>
      )}

      {activeTicket && !resolutionEdit && !closureEdit && (
        <Dialog title="Detail tiket" close={() => setSelected(null)}>
          <div className="detail-head">
            <span className="eyebrow">{activeTicket.id}</span>
            <h2>{activeTicket.title}</h2>
            <p className="muted">
              Dilaporkan oleh <strong>{activeTicket.name}</strong> · {date(activeTicket.created)}
            </p>
          </div>
          <div className="detail-fields">
            <label>
              Status
              <Select
                aria-label="Status tiket"
                value={activeTicket.status}
                disabled={!canUpdateTicket(user, roles, activeTicket)}
                onChange={(e) => moveTicket(activeTicket.id, e.target.value as Status)}
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
                value={activeTicket.category}
                disabled={!canManage}
                onChange={(e) =>
                  changeTicket(
                    activeTicket.id,
                    { category: e.target.value },
                    `Kategori diubah menjadi ${e.target.value}`
                  )
                }
              >
                <option value="Belum dikategorikan" disabled>
                  Belum dikategorikan
                </option>
                {categories
                  .filter(
                    (category) =>
                      category.active !== false || category.name === activeTicket.category
                  )
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
                value={activeTicket.priority}
                disabled={!canManage}
                onChange={(e) =>
                  changeTicket(
                    activeTicket.id,
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
                value={activeTicket.reviewer}
                disabled={!canManage}
                onChange={(e) =>
                  changeTicket(
                    activeTicket.id,
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
                value={activeTicket.agent}
                disabled={!canManage}
                onChange={(e) =>
                  changeTicket(
                    activeTicket.id,
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
                Project{' '}
                <strong>{projects.find((p) => p.id === activeTicket.projectId)?.name}</strong>
              </span>
              <span>
                Dampak yang dilaporkan <strong>{activeTicket.impact || 'Tidak disebutkan'}</strong>
              </span>
            </div>
            <h3>Deskripsi laporan</h3>
            <p>{activeTicket.description}</p>
            <span className="category-tag">{activeTicket.category}</span>
            <span className="muted small-text"> {activeTicket.email}</span>
            {activeTicket.attachments.map((a, i) => (
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
          {activeTicket.resolution && (
            <section className="resolution-card">
              <h3>Ringkasan penyelesaian</h3>
              <div>
                <strong>Penyebab masalah</strong>
                <p>{activeTicket.resolution.cause}</p>
              </div>
              <div>
                <strong>Perbaikan yang dilakukan</strong>
                <p>{activeTicket.resolution.fix}</p>
              </div>
              <div>
                <strong>Dampak / perubahan</strong>
                <p>{activeTicket.resolution.impact}</p>
              </div>
              <div>
                <strong>Langkah untuk pelapor</strong>
                <p>{activeTicket.resolution.reporterSteps}</p>
              </div>
              {activeTicket.resolution.internalNotes && (
                <div>
                  <strong>Catatan internal</strong>
                  <p>{activeTicket.resolution.internalNotes}</p>
                </div>
              )}
            </section>
          )}
          {activeTicket.closure && (
            <section className="resolution-card">
              <h3>Alasan penutupan</h3>
              <p>{activeTicket.closure.reason}</p>
              <small>
                {activeTicket.closure.author} · {date(activeTicket.closure.at)}
              </small>
            </section>
          )}
          {activeTicket.trackingToken && (
            <a
              className="text-button"
              href={`/track/${encodeURIComponent(activeTicket.trackingToken)}`}
              target="_blank"
              rel="noreferrer"
            >
              Buka halaman tracking pelapor <ExternalLink size={14} />
            </a>
          )}
          <h3>Diskusi tiket</h3>
          {activeTicket.comments.map((c, i) => (
            <div className={`comment ${c.internal ? 'internal' : ''}`} key={i}>
              <strong>
                {c.author}{' '}
                <span className="category-tag">{c.authorRole ?? 'Role belum tercatat'}</span>
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
                  activeTicket.id,
                  {
                    comments: [
                      ...activeTicket.comments,
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
          <TicketHistory history={[...activeTicket.history].reverse()} />
        </Dialog>
      )}

      {resolutionEdit && (
        <Dialog title="Selesaikan tiket" close={() => setResolutionEdit(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const values = {
                cause: String(fd.get('cause')).trim(),
                fix: String(fd.get('fix')).trim(),
                impact: String(fd.get('impact')).trim(),
                reporterSteps: String(fd.get('reporterSteps')).trim(),
                internalNotes: String(fd.get('internalNotes') ?? '').trim(),
              };
              if (
                Object.values(values)
                  .slice(0, 4)
                  .some((v) => !v)
              ) {
                setToast('Lengkapi empat bagian yang terlihat pelapor.');
                return;
              }
              const t = tickets.find((x) => x.id === resolutionEdit);
              if (t)
                changeTicket(
                  t.id,
                  {
                    status: 'Resolved',
                    resolution: {
                      ...values,
                      at: new Date().toISOString(),
                      author: user.name,
                      authorRole: roleLabel(user, roles),
                    },
                  },
                  'Status diubah menjadi Resolved'
                );
              setResolutionEdit(null);
            }}
          >
            <p className="muted">Empat bagian pertama akan terlihat pada halaman tracking.</p>
            <label>
              Penyebab masalah
              <textarea name="cause" required rows={3} />
            </label>
            <label>
              Perbaikan yang dilakukan
              <textarea name="fix" required rows={3} />
            </label>
            <label>
              Dampak / perubahan
              <textarea name="impact" required rows={3} />
            </label>
            <label>
              Langkah untuk pelapor
              <textarea name="reporterSteps" required rows={3} />
            </label>
            <label>
              Catatan internal (opsional)
              <textarea name="internalNotes" rows={2} />
            </label>
            <button className="primary" type="submit">
              <Check size={16} /> Simpan & tandai Resolved
            </button>
          </form>
        </Dialog>
      )}

      {closureEdit && (
        <Dialog title="Tutup tiket" close={() => setClosureEdit(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get('reason')).trim();
              if (!reason) {
                setToast('Alasan penutupan wajib diisi.');
                return;
              }
              const t = tickets.find((x) => x.id === closureEdit);
              if (t)
                changeTicket(
                  t.id,
                  {
                    status: 'Closed',
                    closure: {
                      reason,
                      at: new Date().toISOString(),
                      author: user.name,
                      authorRole: roleLabel(user, roles),
                    },
                  },
                  'Tiket ditutup: ' + reason
                );
              setClosureEdit(null);
            }}
          >
            <p className="muted">
              Pastikan solusi sudah dikonfirmasi atau jelaskan alasan tiket ditutup.
            </p>
            <label>
              Alasan penutupan
              <textarea
                name="reason"
                required
                rows={4}
                placeholder="Contoh: Solusi sudah dikonfirmasi oleh pelapor…"
              />
            </label>
            <button className="primary" type="submit">
              <Check size={16} /> Simpan & tutup tiket
            </button>
          </form>
        </Dialog>
      )}

      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
          <button aria-label="Tutup notifikasi" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
