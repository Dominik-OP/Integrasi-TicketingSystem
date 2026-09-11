import { createHash } from 'node:crypto';

/** Tracking tokens are only ever stored and compared as sha256 hashes. */
export const trackingTokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export type ReporterAction =
  | { action: 'reply'; body: string }
  | { action: 'confirm'; resolved: boolean; note: string }
  | { action: 'feedback'; rating: number; comment: string };

type Parsed = { ok: true; token: string; value: ReporterAction } | { ok: false; error: string };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function parseReporterAction(input: Record<string, unknown>): Parsed {
  const token = text(input.token);
  if (!/^[0-9a-f]{16,128}$/i.test(token)) {
    return { ok: false, error: 'Buka halaman ini dari link pribadi di email Anda.' };
  }
  if (input.action === 'reply') {
    const body = text(input.body);
    if (!body) return { ok: false, error: 'Tulis balasan terlebih dahulu.' };
    if (body.length > 5000) return { ok: false, error: 'Balasan maksimal 5000 karakter.' };
    return { ok: true, token, value: { action: 'reply', body } };
  }
  if (input.action === 'confirm') {
    if (typeof input.resolved !== 'boolean') {
      return { ok: false, error: 'Pilih apakah masalah sudah selesai.' };
    }
    const note = text(input.note);
    if (!input.resolved && !note) {
      return { ok: false, error: 'Ceritakan kendala yang masih terjadi.' };
    }
    if (note.length > 2000) return { ok: false, error: 'Catatan maksimal 2000 karakter.' };
    return { ok: true, token, value: { action: 'confirm', resolved: input.resolved, note } };
  }
  if (input.action === 'feedback') {
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: 'Pilih penilaian 1 sampai 5.' };
    }
    const comment = text(input.comment);
    if (comment.length > 2000) return { ok: false, error: 'Komentar maksimal 2000 karakter.' };
    return { ok: true, token, value: { action: 'feedback', rating, comment } };
  }
  return { ok: false, error: 'Aksi tidak didukung.' };
}

const databaseMessages: [RegExp, string, number][] = [
  [/tracking link is invalid or expired/, 'Link tracking tidak valid atau sudah kedaluwarsa.', 404],
  [
    /too many replies/,
    'Terlalu banyak balasan dalam waktu singkat. Coba lagi beberapa menit lagi.',
    429,
  ],
  [/ticket is closed/, 'Tiket sudah ditutup dan tidak dapat dibalas.', 409],
  [/not awaiting confirmation/, 'Tiket ini tidak sedang menunggu konfirmasi.', 409],
  [/not resolved yet/, 'Penilaian dapat diberikan setelah tiket diselesaikan.', 409],
  [/reopen reason is required/, 'Ceritakan kendala yang masih terjadi.', 400],
  [/too long/, 'Pesan terlalu panjang.', 400],
];

/** Maps RPC errors to reporter-facing messages without leaking database details. */
export function reporterActionError(message: string) {
  const match = databaseMessages.find(([pattern]) => pattern.test(message));
  return match
    ? { error: match[1], status: match[2] }
    : { error: 'Aksi gagal diproses. Coba lagi nanti.', status: 400 };
}
