'use client';
import { Empty } from '@/components/ui';
import { type Category, type Member, type Ticket } from '@/lib/demo';
import { baseRole, roleLabel, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import { Users } from 'lucide-react';

interface TeamViewProps {
  team: Member[];
  roles: RoleDefinition[];
  tickets: Ticket[];
  categories: Category[];
  projects: Project[];
  user: Member;
  canManageUsers: boolean;
  canManageRoles: boolean;
  onEditMember: (member: Member | null) => void;
  labels: Record<string, string>;
}

export default function TeamView({
  team,
  roles,
  tickets,
  canManageUsers,
  canManageRoles,
  onEditMember,
  labels,
}: TeamViewProps) {
  if (!canManageUsers && !canManageRoles) {
    return <Empty text="Halaman ini hanya tersedia untuk Admin." />;
  }

  return (
    <>
      <div className="info-box">
        <Users size={20} />
        <p>
          Tim kecil, dampak besar. Atur peran dan tanggung jawab untuk menjaga setiap tiket tetap
          tertangani.
        </p>
      </div>
      <div className="member-grid">
        {team.map((m) => (
          <section className="member-card" key={m.id}>
            <div className="member-card-top">
              <span className={`avatar color-${m.name.length % 4}`}>
                {m.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span className={`member-status ${m.active ? '' : 'inactive'}`}>
                {m.active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <h2>{m.name}</h2>
            <p>{m.email}</p>
            <span className="category-tag">{roleLabel(m, roles)}</span>
            <span className="base-level">Level: {labels[baseRole(m, roles)]}</span>
            <div className="member-bottom">
              <span>
                <strong>
                  {
                    tickets.filter(
                      (t) => t.agent === m.id && !['Resolved', 'Closed'].includes(t.status)
                    ).length
                  }
                </strong>{' '}
                tiket aktif
              </span>
              <button className="outline" onClick={() => onEditMember(m)}>
                Edit anggota
              </button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
