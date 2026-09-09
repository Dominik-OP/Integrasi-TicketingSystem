'use client';
import type { Role } from '@/lib/domain';
import { Check, Pencil, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAccessLabels, type AccessLabels } from '../preferences';

const levels: Role[] = ['Agent', 'Reviewer', 'Admin'];
const descriptions = {
  Agent: 'Mengerjakan tiket yang ditugaskan.',
  Reviewer: 'Meninjau dan mendelegasikan tiket.',
  Admin: 'Mengelola workspace dan hak akses.',
};
export default function AccessLevelNames({ notify }: { notify: (message: string) => void }) {
  const { labels, saveLabels } = useAccessLabels();
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<AccessLabels>(labels);
  return (
    <section className="panel access-names">
      <div className="panel-heading">
        <div>
          <h2>Nama level akses</h2>
          <p className="muted">
            Sesuaikan nama level dengan istilah di tim Anda. Nama ini digunakan pada pilihan level
            akses dan informasi anggota.
          </p>
        </div>
        {!editing && (
          <button
            className="outline"
            onClick={() => {
              setDraft({ ...labels });
              setEditing(true);
            }}
          >
            <Pencil size={14} /> Ubah nama level
          </button>
        )}
      </div>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = Object.fromEntries(
              levels.map((key) => [key, draft[key].trim()])
            ) as AccessLabels;
            if (levels.some((key) => !next[key])) {
              notify('Nama setiap level wajib diisi.');
              return;
            }
            if (new Set(levels.map((key) => next[key].toLowerCase())).size !== 3) {
              notify('Gunakan nama yang berbeda untuk setiap level.');
              return;
            }
            saveLabels(next);
            setEditing(false);
            notify('Nama level akses berhasil diperbarui.');
          }}
        >
          <div className="access-name-grid">
            {levels.map((key) => (
              <label key={key}>
                <span>{descriptions[key]}</span>
                <input
                  required
                  maxLength={40}
                  aria-label={`Nama level ${labels[key]}`}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="muted small-text">
            Perubahan nama tetap mempertahankan izin yang sudah diatur.
          </p>
          <div className="access-name-actions">
            <button type="button" className="outline" onClick={() => setEditing(false)}>
              Batal
            </button>
            <button className="primary">
              <Check size={15} /> Simpan nama level
            </button>
          </div>
        </form>
      ) : (
        <div className="access-name-grid">
          {levels.map((key) => (
            <div key={key}>
              <ShieldCheck size={18} />
              <strong>{labels[key]}</strong>
              <small>{descriptions[key]}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
