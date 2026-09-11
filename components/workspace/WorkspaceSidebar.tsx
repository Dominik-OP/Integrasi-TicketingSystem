'use client';
import { Avatar } from '@/components/ui';
import type { Member } from '@/lib/domain';
import { roleLabel, type Permission, type RoleDefinition } from '@/lib/permissions';
import type { Project } from '@/lib/projects';
import {
  ChartNoAxesCombined,
  CircleHelp,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Tickets,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import WorkspaceSwitcher from '../workspace-switcher';

const nav = [
  { id: 'board', label: 'Papan tiket', icon: LayoutDashboard },
  { id: 'tickets', label: 'Semua tiket', icon: Tickets },
  { id: 'reports', label: 'Analitik & laporan', icon: ChartNoAxesCombined },
  { id: 'team', label: 'Anggota tim', icon: Users },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export default function WorkspaceSidebar({
  view,
  mobileOpen,
  projects,
  projectId,
  openTicketCount,
  user,
  roles,
  can,
  onProjectChange,
  onNavigate,
  onManageProjects,
  onSignOut,
}: {
  view: string;
  mobileOpen: boolean;
  projects: Project[];
  projectId: string;
  openTicketCount: number;
  user: Member;
  roles: RoleDefinition[];
  can: (permission: Permission) => boolean;
  onProjectChange: (id: string) => void;
  onNavigate: (view: string) => void;
  onManageProjects: () => void;
  onSignOut: () => void;
}) {
  const visibleNav = nav.filter((item) =>
    item.id === 'team'
      ? can('manage_users') || can('manage_roles')
      : item.id === 'reports'
        ? can('view_reports')
        : true
  );
  return (
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
        onChange={onProjectChange}
        {...(can('manage_projects') ? { onManage: onManageProjects } : {})}
      />
      <span className="nav-label">WORKSPACE</span>
      <nav>
        {visibleNav.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
            {item.id === 'board' && <span className="nav-count">{openTicketCount}</span>}
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
          <button onClick={() => onNavigate('track')}>
            <Search size={18} /> Lacak tiket publik <ExternalLink size={13} />
          </button>
        </div>
        <div className="profile">
          <Avatar name={user.name} />
          <div>
            <strong>{user.name.split(' ')[0]}</strong>
            <small>{roleLabel(user, roles)}</small>
          </div>
          <button title="Keluar" onClick={onSignOut}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
