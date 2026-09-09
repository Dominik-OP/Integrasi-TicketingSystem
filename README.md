# Integrasi Ticketing System

Aplikasi ticketing internal dan portal laporan publik berbasis Next.js dengan backend InsForge.

## Status implementasi

- Login workspace menggunakan kode OTP yang dikirim ke email melalui InsForge Auth.
- Hanya email berdomain tepat `adiraja-integrasi.com` yang dapat meminta akses.
- Pada database fresh, email kantor pertama otomatis menjadi Admin.
- Akun berikutnya menunggu persetujuan Admin dan pemilihan role.
- Portal publik membuat tiket nyata tanpa kategori awal dan menyediakan link tracking berbasis token hash.
- Workspace membaca project, kategori, role, anggota, tiket, komentar, dan histori dari InsForge.
- Assignment, perubahan prioritas/status, resolution, closure, dan komentar disimpan melalui RPC transaksional.
- Form publik menempatkan judul dan deskripsi di bagian paling atas; kategori ditentukan oleh tim setelah tiket masuk.

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
Copy-Item .env.example .env.local
pnpm dev
```

Isi `.env.local` dengan URL, anon key, API key project InsForge, dan `TEAM_EMAIL_DOMAIN`. Buka [http://localhost:3000](http://localhost:3000), pilih **Masuk tim**, lalu masukkan email kantor dan kode 6 digit yang dikirim.

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
- bootstrap Admin pertama yang aman terhadap login bersamaan dan tiket publik tanpa kategori awal.
- bucket privat `ticket-attachments` untuk lampiran, dengan signed URL sementara dan metadata pada tabel `attachments`.

API key InsForge adalah credential admin penuh. Jangan menaruhnya pada source code atau variable dengan prefix `NEXT_PUBLIC_`. Browser hanya menerima URL backend dan anon key; operasi privileged dijalankan melalui Route Handler server.

## Halaman utama

- `/` dan `/board`: kanban enam status dengan filter, indikator SLA, dan drag-and-drop.
- `/tickets`: daftar dan detail tiket, assignment, komentar, dan histori.
- `/submit/[project]`: form publik berdasarkan slug project seperti `/submit/app` atau `/submit/web`.
- `/track/[token]`: halaman tracking publik menggunakan token.
- `/reports`: KPI, tren, performa tim, dan ekspor CSV.
- `/team`: anggota, role custom, status aktif, permission override, dan persetujuan akses email.
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

## Catatan integrasi saat ini

Lampiran PNG, JPG, WebP, dan PDF (maksimal 5 MB per file, 5 file per tiket) diunggah ke bucket privat `ticket-attachments`. Aplikasi menyimpan nama file, key, URL storage, mime type, dan ukuran pada tabel `attachments`, lalu membuat signed URL yang berlaku sementara ketika tiket dibuka oleh pelapor atau anggota tim yang berwenang.

Bucket dibuat dengan:

```sh
npx -y @insforge/cli storage create-bucket ticket-attachments --private
```

Email memakai alur hybrid. InsForge Auth mengirim kode OTP login. Resend mengirim konfirmasi tiket, balasan publik, status resolved/closed, dan pemberitahuan tiket baru kepada Admin/Reviewer aktif. Worker `dispatch-ticket-email` memproses database outbox setiap menit; kegagalan email tidak membatalkan perubahan tiket.

Secret worker disimpan melalui InsForge CLI, bukan `.env` frontend atau Git: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `APP_URL`, `EMAIL_WORKER_TOKEN`, dan `TRACKING_TOKEN_SECRET`.
