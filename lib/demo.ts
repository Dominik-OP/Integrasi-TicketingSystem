import type { Permission } from './permissions';
import { dayKey, defaultProjects, newTrackingToken } from './projects';
export const statuses = [
  'New / Open',
  'On Review',
  'In Progress',
  'Waiting on User',
  'Resolved',
  'Closed',
] as const;
export type Status = (typeof statuses)[number];
export const priorityClass = (p: string) => p.toLowerCase();
export type Role = 'Admin' | 'Reviewer' | 'Agent';
export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  roleId?: string;
  overrides?: Partial<Record<Permission, boolean>>;
};
export type Category = {
  name: string;
  priority: string;
  response: number;
  resolution: number;
  active?: boolean;
};
export type Resolution = {
  cause: string;
  fix: string;
  impact: string;
  reporterSteps: string;
  internalNotes?: string;
  at: string;
  author: string;
  authorRole: string;
};
export type Closure = {
  reason: string;
  at: string;
  author: string;
  authorRole: string;
};
export type Ticket = {
  projectId?: string;
  trackingToken?: string;
  impact?: string;
  createdBy?: string;
  id: string;
  title: string;
  description: string;
  name: string;
  email: string;
  category: string;
  priority: string;
  status: Status;
  agent: string;
  reviewer: string;
  created: string;
  updated: string;
  attachments: string[];
  resolution?: Resolution;
  closure?: Closure;
  history: {
    text: string;
    at: string;
    internal?: boolean;
    actorId?: string;
    actorName?: string;
    actorRole?: string;
  }[];
  comments: {
    text: string;
    at: string;
    author: string;
    authorRole?: string;
    internal: boolean;
  }[];
};
export const seedMembers: Member[] = [
  {
    id: '1',
    name: 'Gerald Pratama',
    email: 'gerald@integrasi.demo',
    role: 'Admin',
    roleId: 'admin',
    active: true,
  },
  {
    id: '2',
    name: 'Nadia Putri',
    email: 'nadia@integrasi.demo',
    role: 'Reviewer',
    roleId: 'lead',
    active: true,
  },
  {
    id: '3',
    name: 'Aditya Wijaya',
    email: 'aditya@integrasi.demo',
    role: 'Agent',
    roleId: 'senior',
    active: true,
  },
  {
    id: '4',
    name: 'Sarah Amelia',
    email: 'sarah@integrasi.demo',
    role: 'Agent',
    roleId: 'agent',
    active: true,
  },
];
export const seedCategories: Category[] = [
  { name: 'Akses & Akun', priority: 'High', response: 2, resolution: 8 },
  { name: 'Bug & Error', priority: 'High', response: 1, resolution: 6 },
  { name: 'Permintaan Fitur', priority: 'Low', response: 8, resolution: 48 },
  { name: 'Lainnya', priority: 'Medium', response: 4, resolution: 24 },
];
export function seedTickets(): Ticket[] {
  const titles = [
    'Tidak bisa login ke dashboard',
    'Invoice bulan September tidak muncul',
    'Permintaan akses untuk anggota baru',
    'Error saat mengunduh laporan bulanan',
    'Data transaksi belum tersinkronisasi',
    'Tambahkan filter tanggal pada laporan',
    'Pembayaran berhasil, status masih pending',
    'Notifikasi email diterima dua kali',
    'Halaman profil tidak bisa disimpan',
    'Perubahan alamat email perusahaan',
    'Tampilan tabel terpotong di mobile',
    'Reset autentikasi dua faktor',
    'Ekspor data pelanggan ke Excel',
    'Perbaikan format tanggal invoice',
    'Akses dashboard sudah dipulihkan',
  ];
  const sequences: Record<string, number> = {};
  const names = ['Budi Santoso', 'Dewi Lestari', 'Rizky Ramadhan', 'Amanda Putri', 'Fajar Nugroho'];
  return titles.map((title, i) => {
    const created = new Date(Date.now() - (i + 1) * 3900000).toISOString();
    const status = statuses[i < 3 ? 0 : i < 5 ? 1 : i < 8 ? 2 : i < 10 ? 3 : i < 12 ? 4 : 5];
    const project = defaultProjects[i % 3]!;
    const day = dayKey(new Date(created));
    const key = project.id + day;
    sequences[key] = (sequences[key] ?? 0) + 1;
    const reporterName = names[i % 5]!;
    return {
      id: `${project.prefix}-${day}-${String(sequences[key]).padStart(4, '0')}`,
      projectId: project.id,
      trackingToken: newTrackingToken(),
      title,
      description: `Halo tim support, kami mengalami kendala: ${title.toLowerCase()}. Kendala ini terjadi ketika menggunakan aplikasi untuk aktivitas operasional. Mohon bantuan tim untuk memeriksa dan memberikan solusi. Terima kasih.`,
      name: reporterName,
      email: `${(reporterName.split(' ')[0] ?? 'pelapor').toLowerCase()}@example.com`,
      category: seedCategories[i % seedCategories.length]!.name,
      priority: ['High', 'Medium', 'Low', 'Urgent', 'High'][i % 5]!,
      status,
      agent: i > 4 ? seedMembers[2 + (i % 2)]!.id : '',
      reviewer: i > 2 ? '2' : '',
      created,
      updated: created,
      attachments: i % 4 === 0 ? ['screenshot-kendala.png'] : [],
      comments: [],
      history: [
        {
          text: 'Tiket dibuat oleh pelapor',
          at: created,
          actorName: reporterName,
          actorRole: 'Pelapor',
        },
        ...(i > 2
          ? [
              {
                text: `Status diubah menjadi ${status}`,
                actorId: '2',
                actorName: 'Nadia Putri',
                actorRole: 'Team Lead',
                at: new Date(new Date(created).getTime() + 1800000).toISOString(),
              },
            ]
          : []),
      ],
    };
  });
}
export const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
export const date = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
