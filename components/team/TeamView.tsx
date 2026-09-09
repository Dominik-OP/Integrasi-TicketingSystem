'use client';
import { Empty } from '@/components/ui';
import Select from '@/components/ui/Select';
import { type Category, type Member, type TeamAccessRequest, type Ticket } from '@/lib/domain';
import { baseRole, roleLabel, type RoleDefinition } from '@/lib/permissions';
import { type Project } from '@/lib/projects';
import { Check, Clock3, Users, X } from 'lucide-react';
import { useState } from 'react';

interface TeamViewProps {
  team: Member[];
  accessRequests: TeamAccessRequest[];
  roles: RoleDefinition[];
  tickets: Ticket[];
  categories: Category[];
  projects: Project[];
  user: Member;
  canManageUsers: boolean;
  canManageRoles: boolean;
  onEditMember: (member: Member | null) => void;
  onReviewAccess: (
    request: TeamAccessRequest,
    decision: 'approve' | 'reject',
    roleId?: string
  ) => Promise<void>;
  labels: Record<string, string>;
}

export default function TeamView({
  team,
  accessRequests,
  roles,
  tickets,
  canManageUsers,
  canManageRoles,
  onEditMember,
  onReviewAccess,
  labels,
}: TeamViewProps) {
  const [roleByUser, setRoleByUser] = useState<Record<string, string>>({});
  const [busyUser, setBusyUser] = useState('');
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
      {accessRequests.length > 0 && (
        <section className="access-requests">
          <h2>Menunggu persetujuan</h2>
          <div className="member-grid">
            {accessRequests.map((request) => {
              const roleId =
                roleByUser[request.userId] ?? roles.find((role) => role.base === 'Agent')?.id ?? '';
              const busy = busyUser === request.userId;
              return (
                <section className="member-card" key={request.userId}>
                  <div className="member-card-top">
                    <span className={`avatar color-${request.name.length % 4}`}>
                      {request.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="member-status inactive">
                      <Clock3 size={13} /> Pending
                    </span>
                  </div>
                  <h2>{request.name}</h2>
                  <p>{request.email}</p>
                  <label>
                    Role
                    <Select
                      value={roleId}
                      disabled={busy}
                      onChange={(event) =>
                        setRoleByUser((current) => ({
                          ...current,
                          [request.userId]: event.target.value,
                        }))
                      }
                    >
                      {roles
                        .filter((role) => role.id)
                        .map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                    </Select>
                  </label>
                  <div className="member-bottom">
                    <button
                      className="outline"
                      disabled={busy}
                      onClick={async () => {
                        setBusyUser(request.userId);
                        try {
                          await onReviewAccess(request, 'reject');
                        } finally {
                          setBusyUser('');
                        }
                      }}
                    >
                      <X size={15} /> Tolak
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !roleId}
                      onClick={async () => {
                        setBusyUser(request.userId);
                        try {
                          await onReviewAccess(request, 'approve', roleId);
                        } finally {
                          setBusyUser('');
                        }
                      }}
                    >
                      <Check size={15} /> Setujui
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      )}
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
