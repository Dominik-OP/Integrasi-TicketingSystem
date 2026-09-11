'use client';
import { Dialog } from '@/components/ui';
import type { Closure, Resolution } from '@/lib/domain';
import { Check } from 'lucide-react';

type Author = Pick<Resolution, 'author' | 'authorRole'>;

export function ResolutionDialog({
  author,
  onSubmit,
  notify,
  close,
}: {
  author: Author;
  onSubmit: (resolution: Resolution) => void;
  notify: (message: string) => void;
  close: () => void;
}) {
  return (
    <Dialog title="Selesaikan tiket" close={close}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const values = {
            cause: String(fd.get('cause')).trim(),
            fix: String(fd.get('fix')).trim(),
            impact: String(fd.get('impact')).trim(),
            reporterSteps: String(fd.get('reporterSteps')).trim(),
            internalNotes: String(fd.get('internalNotes') ?? '').trim(),
          };
          if (!values.cause || !values.fix || !values.impact || !values.reporterSteps) {
            notify('Lengkapi empat bagian yang terlihat pelapor.');
            return;
          }
          onSubmit({ ...values, ...author, at: new Date().toISOString() });
          close();
        }}
      >
        <p className="muted">Empat bagian pertama akan terlihat pada halaman tracking.</p>
        <label>
          Penyebab masalah
          <textarea name="cause" required rows={3} />
        </label>
        <label>
          Perbaikan yang dilakukan
          <textarea name="fix" required rows={3} />
        </label>
        <label>
          Dampak / perubahan
          <textarea name="impact" required rows={3} />
        </label>
        <label>
          Langkah untuk pelapor
          <textarea name="reporterSteps" required rows={3} />
        </label>
        <label>
          Catatan internal (opsional)
          <textarea name="internalNotes" rows={2} />
        </label>
        <button className="primary" type="submit">
          <Check size={16} /> Simpan & tandai Resolved
        </button>
      </form>
    </Dialog>
  );
}

export function ClosureDialog({
  author,
  onSubmit,
  notify,
  close,
}: {
  author: Author;
  onSubmit: (closure: Closure) => void;
  notify: (message: string) => void;
  close: () => void;
}) {
  return (
    <Dialog title="Tutup tiket" close={close}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const reason = String(new FormData(e.currentTarget).get('reason')).trim();
          if (!reason) {
            notify('Alasan penutupan wajib diisi.');
            return;
          }
          onSubmit({ reason, ...author, at: new Date().toISOString() });
          close();
        }}
      >
        <p className="muted">
          Pastikan solusi sudah dikonfirmasi atau jelaskan alasan tiket ditutup.
        </p>
        <label>
          Alasan penutupan
          <textarea
            name="reason"
            required
            rows={4}
            placeholder="Contoh: Solusi sudah dikonfirmasi oleh pelapor…"
          />
        </label>
        <button className="primary" type="submit">
          <Check size={16} /> Simpan & tutup tiket
        </button>
      </form>
    </Dialog>
  );
}
