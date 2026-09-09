import type { Member, Role, Ticket } from './domain';

export const permissionList = [
  {
    key: 'view_all',
    label: 'Lihat semua tiket',
    note: 'Tanpa izin ini, hanya tiket yang ditugaskan atau dibuat sendiri.',
  },
  {
    key: 'assign_ticket',
    label: 'Assign & delegasikan tiket',
    note: 'Menentukan reviewer, agent, dan prioritas final.',
  },
  {
    key: 'update_status',
    label: 'Ubah status tiket',
    note: 'Level pelaksana terbatas pada tiket yang ditugaskan kepadanya.',
  },
  {
    key: 'comment',
    label: 'Komentar internal & publik',
    note: 'Menulis diskusi pada tiket yang dapat diakses.',
  },
  {
    key: 'manage_categories',
    label: 'Kelola kategori & SLA',
    note: 'Menentukan prioritas default dan target penanganan.',
  },
  {
    key: 'manage_roles',
    label: 'Kelola role & hak akses',
    note: 'Mengubah role dan pengecualian izin per anggota.',
  },
  {
    key: 'manage_users',
    label: 'Kelola anggota tim',
    note: 'Menambah, mengubah, atau menonaktifkan anggota.',
  },
  {
    key: 'manage_projects',
    label: 'Kelola project & prefix',
    note: 'Mengatur produk dan format nomor tiket.',
  },
  {
    key: 'view_reports',
    label: 'Lihat analitik',
    note: 'Level pelaksana hanya melihat performa miliknya.',
  },
  {
    key: 'export_reports',
    label: 'Ekspor laporan',
    note: 'Mengunduh laporan sesuai cakupan akses.',
  },
] as const;
export type Permission = (typeof permissionList)[number]['key'];
export type RoleDefinition = {
  id: string;
  name: string;
  base: Role;
  permissions: Record<Permission, boolean>;
};
export function defaults(base: Role): Record<Permission, boolean> {
  return Object.fromEntries(
    permissionList.map(({ key }) => [
      key,
      base === 'Admin' ||
        (base === 'Reviewer' &&
          [
            'view_all',
            'assign_ticket',
            'update_status',
            'comment',
            'view_reports',
            'export_reports',
          ].includes(key)) ||
        (base === 'Agent' && ['update_status', 'comment', 'view_reports'].includes(key)),
    ])
  ) as Record<Permission, boolean>;
}
export const defaultRoles: RoleDefinition[] = [
  { id: 'admin', name: 'Admin', base: 'Admin', permissions: defaults('Admin') },
  {
    id: 'lead',
    name: 'Team Lead',
    base: 'Reviewer',
    permissions: defaults('Reviewer'),
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    base: 'Reviewer',
    permissions: defaults('Reviewer'),
  },
  {
    id: 'senior',
    name: 'Senior Agent',
    base: 'Agent',
    permissions: defaults('Agent'),
  },
  { id: 'agent', name: 'Agent', base: 'Agent', permissions: defaults('Agent') },
];
export const memberRole = (member: Member, roles: RoleDefinition[]) =>
  roles.find((r) => r.id === member.roleId) ?? roles.find((r) => r.base === member.role)!;
export const roleLabel = (member: Member, roles: RoleDefinition[]) =>
  memberRole(member, roles)?.name ?? member.role;
export const baseRole = (member: Member, roles: RoleDefinition[]) =>
  memberRole(member, roles)?.base ?? member.role;
export function hasPermission(member: Member, roles: RoleDefinition[], key: Permission) {
  if (!member.active) return false;
  return (
    member.overrides?.[key] ??
    memberRole(member, roles)?.permissions[key] ??
    defaults(member.role)[key]
  );
}
export function canViewTicket(member: Member, roles: RoleDefinition[], ticket: Ticket) {
  return (
    hasPermission(member, roles, 'view_all') ||
    ticket.agent === member.id ||
    ticket.createdBy === member.id
  );
}
export function canUpdateTicket(member: Member, roles: RoleDefinition[], ticket: Ticket) {
  return (
    hasPermission(member, roles, 'update_status') &&
    canViewTicket(member, roles, ticket) &&
    (baseRole(member, roles) !== 'Agent' || ticket.agent === member.id)
  );
}
export function can(member: Member, roles: RoleDefinition[], key: Permission) {
  return hasPermission(member, roles, key);
}
