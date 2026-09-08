# Integrasi Ticketing System

Aplikasi ticketing internal dan portal laporan publik berbasis Next.js. Frontend saat ini sudah menyediakan alur demo lengkap, sedangkan fondasi database telah diterapkan pada InsForge dan siap untuk tahap integrasi aplikasi.

## Status implementasi

- Frontend dashboard, board, daftar tiket, laporan, tim, dan pengaturan tersedia sebagai demo interaktif.
- Portal publik mendukung link per project dan halaman tracking tiket.
- Database InsForge sudah memiliki schema, constraint, index, RLS, master data, dan RPC transaksional.
- Integrasi frontend dengan InsForge Auth, Database SDK, Storage, dan Route Handler belum disambungkan.
- Data yang tampil di frontend masih berasal dari localStorage dan data demo; jangan gunakan data sensitif.

## Teknologi

- Next.js 16 App Router
- React 19 dan TypeScript
- InsForge Postgres, Auth, Storage, dan Realtime
- `@insforge/cli` untuk migration dan pengelolaan backend
- dnd-kit untuk interaksi kanban
- CSS responsif dengan dukungan tema terang dan gelap

## Menjalankan secara lokal

Gunakan Node.js 22.18 atau yang lebih baru dan pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000). Pada tahap sekarang, pilih akun demo untuk masuk ke workspace internal.

## Menyiapkan backend InsForge

Project InsForge yang digunakan bernama `Integrasi`. Credential login dan file `.insforge/project.json` bersifat lokal dan tidak disimpan di Git.

```sh
npx -y @insforge/cli login
npx -y @insforge/cli link --project-id 9a237ec6-d48e-4f23-bad5-d92d9175003d
npx -y @insforge/cli db migrations up --all
```

Migration database berada di folder `migrations/` dan mencakup:

- level akses, role, permission, override pengguna, dan preferensi;
- project, kategori, serta aturan SLA;
- tiket, counter nomor atomik, assignment, resolution, dan optimistic versioning;
- event history, komentar publik/internal, serta metadata attachment;
- tracking grant berbasis token hash, outbox email, delivery log, dan audit event;
- Row Level Security dan pembatasan tabel server-only;
- RPC transaksional untuk membuat tiket, assignment, transisi status, dan komentar.

API key InsForge adalah credential admin penuh. Jangan menaruhnya pada source code atau variable dengan prefix `NEXT_PUBLIC_`. Saat integrasi dimulai, browser hanya akan menerima URL backend dan anon key; operasi privileged dijalankan melalui Route Handler server.

## Halaman utama

- `/` dan `/board`: kanban enam status dengan filter, indikator SLA, dan drag-and-drop.
- `/tickets`: daftar dan detail tiket, assignment, komentar, dan histori.
- `/submit/[project]`: form publik berdasarkan slug project seperti `/submit/app` atau `/submit/web`.
- `/track/[token]`: halaman tracking publik menggunakan token.
- `/reports`: KPI, tren, performa tim, dan ekspor CSV.
- `/team`: anggota, role custom, status aktif, dan permission override.
- `/settings/categories`: kategori dan target SLA.
- `/settings/roles`: role, base access level, dan permission matrix.
- `/settings/projects`: project, prefix tiket, dan link laporan publik.

## Validasi

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Nomor tiket menggunakan format `{PREFIX}-{YYYYMMDD}-{0001}`, dengan sequence independen per project dan tanggal bisnis Asia/Jakarta. Database memastikan nomor tetap unik saat ada submit paralel dan mengembalikan tiket yang sama ketika idempotency key dikirim ulang.

## Keamanan repository

Repository tidak menyimpan `.env`, credential InsForge, cache/build output, konfigurasi agent lokal, atau dokumen perencanaan internal. Sebelum commit, selalu periksa hasil `git status` dan pastikan hanya source, konfigurasi build, test, migration, serta dokumentasi publik yang ikut.
