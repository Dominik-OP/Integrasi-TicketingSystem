'use client';
import { Dialog } from '@/components/ui';
import Select from '@/components/ui/Select';
import type { Category } from '@/lib/domain';
import { Check, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

export default function CategoryDialog({
  category,
  categories,
  saveCategory,
  notify,
  close,
}: {
  /** `null` adds a new category. */
  category: Category | null;
  categories: Category[];
  saveCategory: (category: Category) => Promise<void>;
  notify: (message: string) => void;
  close: () => void;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog title={category ? 'Edit kategori & SLA' : 'Tambah kategori'} close={close}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          const fd = new FormData(e.currentTarget);
          const data: Category = {
            name: String(fd.get('name')).trim(),
            priority: String(fd.get('priority')),
            response: Number(fd.get('response')),
            resolution: Number(fd.get('resolution')),
            active: fd.get('active') === 'on',
          };
          if (
            categories.some(
              (c) => c.name.toLowerCase() === data.name.toLowerCase() && c.name !== category?.name
            )
          ) {
            notify('Nama kategori sudah digunakan.');
            return;
          }
          if (data.resolution < data.response) {
            notify('Target penyelesaian harus sama atau lebih besar dari target respons.');
            return;
          }
          setSaving(true);
          try {
            await saveCategory({ ...data, ...(category?.id ? { id: category.id } : {}) });
            close();
            notify('Kategori dan aturan SLA disimpan ke backend.');
          } catch (error) {
            notify(error instanceof Error ? error.message : 'Kategori gagal disimpan.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Nama kategori
          <input name="name" required defaultValue={category?.name} />
        </label>
        <label>
          Prioritas default
          <Select name="priority" defaultValue={category?.priority ?? 'Medium'}>
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </label>
        <div className="form-row">
          <label>
            Respons (jam)
            <input
              name="response"
              type="number"
              min="1"
              max="720"
              required
              defaultValue={category?.response ?? 2}
            />
          </label>
          <label>
            Penyelesaian (jam)
            <input
              name="resolution"
              type="number"
              min="1"
              max="2160"
              required
              defaultValue={category?.resolution ?? 24}
            />
          </label>
        </div>
        <label className="check-label">
          <input type="checkbox" name="active" defaultChecked={category?.active !== false} />{' '}
          Kategori aktif pada form laporan
        </label>
        <button className="primary" type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="loading-spinner" size={16} /> : <Check size={16} />}{' '}
          {saving ? 'Menyimpan…' : 'Simpan aturan'}
        </button>
      </form>
    </Dialog>
  );
}
