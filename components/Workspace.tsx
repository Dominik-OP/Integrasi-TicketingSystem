'use client';
import BoardView from '@/components/board/BoardView';
import ReportsView from '@/components/reports/ReportsView';
import SettingsView from '@/components/settings/SettingsView';
import TeamView from '@/components/team/TeamView';
import TicketsView from '@/components/tickets/TicketsView';
import { Dialog, Empty } from '@/components/ui';
import AttentionDialog from '@/components/workspace/AttentionDialog';
import CategoryDialog from '@/components/workspace/CategoryDialog';
import MemberDialog from '@/components/workspace/MemberDialog';
import TicketDetailDialog from '@/components/workspace/TicketDetailDialog';
import { ClosureDialog, ResolutionDialog } from '@/components/workspace/TicketStatusDialogs';
import TicketSubmission from '@/components/workspace/TicketSubmission';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
import WorkspaceTopbar from '@/components/workspace/WorkspaceTopbar';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/hooks/useFilters';
import { useReports } from '@/hooks/useReports';
import { useTickets } from '@/hooks/useTickets';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { type Category, type Member, type Ticket } from '@/lib/domain';
import { canViewTicket, roleLabel } from '@/lib/permissions';
import { ticketsCsv } from '@/lib/ticket-export';
import { CircleCheck, Download, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccessLabels } from './preferences';
import PublicPortal from './public-portal';

const pages: Record<string, { title: string; subtitle: string }> = {
  board: { title: 'Papan tiket', subtitle: 'Setiap tiket punya cerita. Mari selesaikan bersama.' },
  tickets: { title: 'Semua tiket', subtitle: 'Semua laporan dan progresnya, dalam satu tempat.' },
  reports: {
    title: 'Analitik & laporan',
    subtitle: 'Pahami performa tim. Bangun layanan yang lebih baik.',
  },
  team: { title: 'Anggota tim', subtitle: 'Orang-orang di balik setiap solusi.' },
  settings: {
    title: 'Pengaturan',
    subtitle: 'Sesuaikan alur support dengan kebutuhan tim Anda.',
  },
};
const publicViews = ['submit', 'track', 'login'];

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
  const { labels } = useAccessLabels();
  const [token, setToken] = useState(initialToken);
  const [toast, setToast] = useState('');
  const [creating, setCreating] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  const { user, signedIn, accessStatus, authLoading, can, canManage, signIn, signOut } = useAuth(
    team,
    roles,
    ready
  );

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
    const targetProject = publicViews.includes(next)
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

  const view = !signedIn && !publicViews.includes(requestedView) ? 'login' : requestedView;
  const page = pages[view] ?? pages.board!;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const exportCSV = () => {
    if (!can('export_reports')) return;
    const csv = ticketsCsv(
      view === 'reports' ? reportsData.reportTickets : filteredTickets,
      (id) => projects.find((p) => p.id === id)?.name ?? '',
      team,
      (member) => roleLabel(member, roles)
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
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

  if (publicViews.includes(view)) {
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
          form={
            <TicketSubmission
              publicForm
              projectId={publicProjectId}
              projects={projects}
              categories={categories}
              notify={setToast}
              onCreated={(ticket) => setSubmitted(ticket)}
            />
          }
          token={token}
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

  const author = { author: user.name, authorRole: roleLabel(user, roles) };

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
        <WorkspaceSidebar
          view={view}
          mobileOpen={mobileOpen}
          projects={projects}
          projectId={projectId}
          openTicketCount={visibleTickets.filter((t) => t.status !== 'Closed').length}
          user={user}
          roles={roles}
          can={can}
          onProjectChange={setProjectId}
          onNavigate={navigate}
          onManageProjects={() => navigateSettings('projects')}
          onSignOut={async () => {
            await signOut();
            navigate('login');
          }}
        />
        <div className="main-shell">
          <WorkspaceTopbar
            title={page.title}
            mobileOpen={mobileOpen}
            hasAttention={reportsData.overdue.length > 0}
            activeWorkspace={projects.find((p) => p.id === projectId)}
            onToggleMobile={() => setMobileOpen(!mobileOpen)}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
          <main className="main-content">
            <div className="page-heading">
              <div>
                <div className="overline">SUPPORT WORKSPACE</div>
                <h1>{page.title}</h1>
                <p>{page.subtitle}</p>
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
                previousTickets={reportsData.previousTickets}
                previousMetrics={reportsData.previousMetrics}
                onSelectTicket={setSelected}
                onViewTickets={() => navigate('tickets')}
                onViewAgentTickets={(agentId) => {
                  resetFilters();
                  setAgent(agentId);
                  navigate('tickets');
                }}
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
          <TicketSubmission
            publicForm={false}
            projectId={projectId}
            projects={projects}
            categories={categories}
            notify={setToast}
            onCreated={async (ticket, createdProjectId) => {
              setCreating(false);
              setProjectId(createdProjectId);
              setSelected(ticket.id);
              await reload();
              setToast('Tiket berhasil dibuat.');
            }}
          />
        </Dialog>
      )}
      {notificationsOpen && (
        <AttentionDialog
          overdue={reportsData.overdue}
          onSelect={setSelected}
          close={() => setNotificationsOpen(false)}
        />
      )}
      {memberEdit !== undefined && (
        <MemberDialog
          member={memberEdit}
          roles={roles}
          can={can}
          saveMember={saveMember}
          notify={setToast}
          close={() => setMemberEdit(undefined)}
        />
      )}
      {categoryEdit !== undefined && (
        <CategoryDialog
          category={categoryEdit}
          categories={categories}
          saveCategory={saveCategory}
          notify={setToast}
          close={() => setCategoryEdit(undefined)}
        />
      )}
      {activeTicket && !resolutionEdit && !closureEdit && (
        <TicketDetailDialog
          ticket={activeTicket}
          user={user}
          roles={roles}
          team={team}
          categories={categories}
          projects={projects}
          canManage={canManage}
          can={can}
          moveTicket={moveTicket}
          changeTicket={changeTicket}
          close={() => setSelected(null)}
        />
      )}
      {resolutionEdit && (
        <ResolutionDialog
          author={author}
          notify={setToast}
          close={() => setResolutionEdit(null)}
          onSubmit={(resolution) => {
            if (tickets.some((t) => t.id === resolutionEdit))
              changeTicket(
                resolutionEdit,
                { status: 'Resolved', resolution },
                'Status diubah menjadi Resolved'
              );
          }}
        />
      )}
      {closureEdit && (
        <ClosureDialog
          author={author}
          notify={setToast}
          close={() => setClosureEdit(null)}
          onSubmit={(closure) => {
            if (tickets.some((t) => t.id === closureEdit))
              changeTicket(
                closureEdit,
                { status: 'Closed', closure },
                'Tiket ditutup: ' + closure.reason
              );
          }}
        />
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
