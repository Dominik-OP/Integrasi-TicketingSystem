'use client';
import { ThemeToggle } from '@/components/preferences';
import type { Project } from '@/lib/projects';
import { Bell, ChevronRight, Layers3, Menu } from 'lucide-react';

export default function WorkspaceTopbar({
  title,
  mobileOpen,
  hasAttention,
  activeWorkspace,
  onToggleMobile,
  onOpenNotifications,
}: {
  title: string;
  mobileOpen: boolean;
  hasAttention: boolean;
  activeWorkspace: Project | undefined;
  onToggleMobile: () => void;
  onOpenNotifications: () => void;
}) {
  return (
    <header className="topbar">
      <button
        className="mobile-toggle"
        aria-label="Buka menu navigasi"
        aria-expanded={mobileOpen}
        onClick={onToggleMobile}
      >
        <Menu size={20} />
      </button>
      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="topbar-right">
        <ThemeToggle />
        <button
          className="notification-button"
          aria-label="Notifikasi"
          onClick={onOpenNotifications}
        >
          <Bell size={19} />
          {hasAttention && <i />}
        </button>
        <div className="active-workspace" aria-label="Workspace aktif">
          <span className="active-workspace-symbol">
            {activeWorkspace ? <>{activeWorkspace.prefix.slice(0, 2)}</> : <Layers3 size={15} />}
          </span>
          <span className="active-workspace-name">{activeWorkspace?.name ?? 'Semua project'}</span>
        </div>
      </div>
    </header>
  );
}
