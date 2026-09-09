'use client';
import { ProjectSettings, RoleSettings } from '@/components/settings/master-data';
import { Empty } from '@/components/ui';
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
  onSaveProjects: (p: Project[]) => void;
  onSaveRoles: (r: RoleDefinition[]) => void;
  notify: (msg: string) => void;
  canManageCategories: boolean;
  canManageRoles: boolean;
  canManageProjects: boolean;
  onEditCategory: (cat: Category | null) => void;
}

export default function SettingsView({
  settingsTab,
  navigateSettings,
  projects,
  tickets,
  roles,
  team,
  categories,
  user,
  onSaveProjects,
  onSaveRoles,
  notify,
  canManageCategories,
  canManageRoles,
  canManageProjects,
  onEditCategory,
}: SettingsViewProps) {
  const canSettings = canManageCategories || canManageRoles || canManageProjects;

  if (!canSettings) {
    return <Empty text="Anda tidak memiliki izin pengaturan." />;
  }

  return (
    <>
      <div className="settings-tabs">
        {[
          {
            id: 'categories',
            label: 'Kategori & SLA',
            permission: 'manage_categories' as Permission,
          },
          { id: 'roles', label: 'Role & hak akses', permission: 'manage_roles' as Permission },
          {
            id: 'projects',
            label: 'Project & prefix',
            permission: 'manage_projects' as Permission,
          },
        ]
          .filter((t) => can(user, roles, t.permission))
          .map((t) => (
            <button
              key={t.id}
              className={settingsTab === t.id ? 'selected' : ''}
              onClick={() => navigateSettings(t.id)}
            >
              {t.label}
            </button>
          ))}
      </div>

      {settingsTab === 'projects' && canManageProjects && (
        <ProjectSettings
          projects={projects}
          tickets={tickets}
          onSave={onSaveProjects}
          notify={notify}
        />
      )}

      {settingsTab === 'roles' && canManageRoles && (
        <RoleSettings
          roles={roles}
          team={team}
          currentUser={user}
          onSave={onSaveRoles}
          notify={notify}
        />
      )}

      {settingsTab === 'categories' && canManageCategories && (
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

      {((settingsTab === 'categories' && !canManageCategories) ||
        (settingsTab === 'roles' && !canManageRoles) ||
        (settingsTab === 'projects' && !canManageProjects)) && (
        <Empty text="Pilih pengaturan yang tersedia untuk hak akses Anda." />
      )}
    </>
  );
}
