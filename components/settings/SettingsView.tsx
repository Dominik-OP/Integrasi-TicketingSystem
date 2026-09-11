'use client';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import { ProjectSettings, RoleSettings } from '@/components/settings/master-data';
import { type Category, type Member, type Ticket } from '@/lib/domain';
import { can, type Permission, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import { Plus } from 'lucide-react';

interface SettingsViewProps {
  settingsTab: string;
  navigateSettings: (tab: string) => void;
  projects: Project[];
  tickets: Ticket[];
  roles: RoleDefinition[];
  team: Member[];
  categories: Category[];
  user: Member;
  onSaveProject: (project: Project) => Promise<void>;
  onSaveRole: (role: RoleDefinition) => Promise<void>;
  notify: (msg: string) => void;
  canManageCategories: boolean;
  canManageRoles: boolean;
  canManageProjects: boolean;
  onEditCategory: (cat: Category | null) => void;
}

const settingsTabs: { id: string; label: string; permission?: Permission }[] = [
  { id: 'categories', label: 'Kategori & SLA', permission: 'manage_categories' },
  { id: 'roles', label: 'Role & hak akses', permission: 'manage_roles' },
  { id: 'projects', label: 'Project & prefix', permission: 'manage_projects' },
  { id: 'appearance', label: 'Tampilan' },
];

export default function SettingsView({
  settingsTab,
  navigateSettings,
  projects,
  tickets,
  roles,
  team,
  categories,
  user,
  onSaveProject,
  onSaveRole,
  notify,
  canManageCategories,
  canManageRoles,
  canManageProjects,
  onEditCategory,
}: SettingsViewProps) {
  // Appearance is personal, so every member has at least that tab.
  const tabs = settingsTabs.filter((t) => !t.permission || can(user, roles, t.permission));
  const activeTab = tabs.some((t) => t.id === settingsTab) ? settingsTab : 'appearance';

  return (
    <>
      <div className="settings-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={activeTab === t.id ? 'selected' : ''}
            onClick={() => navigateSettings(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'appearance' && <AppearanceSettings />}

      {activeTab === 'projects' && canManageProjects && (
        <ProjectSettings
          projects={projects}
          tickets={tickets}
          onSave={onSaveProject}
          notify={notify}
        />
      )}

      {activeTab === 'roles' && canManageRoles && (
        <RoleSettings
          roles={roles}
          team={team}
          currentUser={user}
          onSave={onSaveRole}
          notify={notify}
        />
      )}

      {activeTab === 'categories' && canManageCategories && (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Kategori & aturan SLA</h2>
                <p className="muted">Kelompokkan laporan dan tentukan target waktu penanganan.</p>
              </div>
              <button className="outline" onClick={() => onEditCategory(null)}>
                <Plus size={16} /> Tambah kategori
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Prioritas default</th>
                    <th>Target respons</th>
                    <th>Target penyelesaian</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <strong>{c.name}</strong>
                        {c.active === false && (
                          <span className="member-status inactive">Nonaktif</span>
                        )}
                      </td>
                      <td>
                        <span className={`priority ${c.priority.toLowerCase()}`}>{c.priority}</span>
                      </td>
                      <td>{c.response} jam</td>
                      <td>{c.resolution} jam</td>
                      <td>
                        <button className="text-button" onClick={() => onEditCategory(c)}>
                          Edit aturan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
