'use client';
import type { Project } from '@/lib/projects';
import { ArrowUpRight, Check, ChevronsUpDown, Layers3, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';

export default function WorkspaceSwitcher({
  projects,
  value,
  onChange,
  onManage,
}: {
  projects: Project[];
  value: string;
  onChange: (id: string) => void;
  onManage?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const current = projects.find((p) => p.id === value);
  const choices = [
    {
      id: '',
      name: 'Semua project',
      prefix: '',
      description: `${projects.length} project dalam satu workspace`,
      active: true,
    },
    ...projects,
  ].filter((p) => `${p.name} ${p.prefix}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <button
        className="workspace-trigger"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-label={`Ganti workspace: ${current?.name ?? 'Semua project'}`}
      >
        <span className="workspace-symbol">
          {current ? current.prefix.slice(0, 2) : <Layers3 size={19} />}
        </span>
        <span>
          <small>WORKSPACE</small>
          <strong>{current?.name ?? 'Semua project'}</strong>
        </span>
        <ChevronsUpDown size={15} />
      </button>
      <dialog
        ref={dialog}
        className="workspace-dialog"
        aria-label="Pilih workspace"
        onClose={() => setQuery('')}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              dialog.current?.close();
          }
        }}
      >
        <header>
          <div>
            <h2>Pindah workspace</h2>
            <p>Pilih project yang ingin Anda kelola.</p>
          </div>
          <button aria-label="Tutup pilihan workspace" onClick={() => dialog.current?.close()}>
            <X size={17} />
          </button>
        </header>
        <label className="workspace-search">
          <Search size={16} />
          <input
            autoFocus
            placeholder="Cari nama atau prefix project…"
            aria-label="Cari workspace"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="workspace-options">
          {choices.map((p) => (
            <button
              key={p.id}
              className={p.id === value ? 'chosen' : ''}
              onClick={() => {
                onChange(p.id);
                dialog.current?.close();
              }}
            >
              <span className="workspace-symbol">
                {p.id ? p.prefix.slice(0, 2) : <Layers3 size={18} />}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.id ? `${p.prefix} · ${p.active ? 'Aktif' : 'Nonaktif'}` : p.description}
                </small>
              </span>
              {p.id === value && <Check size={17} />}
            </button>
          ))}
          {!choices.length && (
            <p className="workspace-no-results">Tidak ada workspace yang cocok.</p>
          )}
        </div>
        <footer>
          <span>{projects.length} project tersedia</span>
          {onManage && (
            <button
              onClick={() => {
                dialog.current?.close();
                onManage();
              }}
            >
              Kelola project <ArrowUpRight size={13} />
            </button>
          )}
        </footer>
      </dialog>
    </>
  );
}
