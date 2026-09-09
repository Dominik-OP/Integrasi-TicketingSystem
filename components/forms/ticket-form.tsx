'use client';
import Select from '@/components/ui/Select';
import type { Category } from '@/lib/domain';
import type { Project } from '@/lib/projects';
import { Layers3, Paperclip, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export const impacts = [
  'Sama sekali tidak bisa menggunakan sistem',
  'Ada fitur bermasalah, tetapi masih bisa bekerja',
  'Pertanyaan atau saran',
];
export default function TicketForm({
  categories,
  projects,
  projectId,
  onSubmit,
  publicForm = false,
}: {
  categories: Category[];
  projects: Project[];
  projectId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  publicForm?: boolean;
}) {
  const activeCategories = categories.filter((c) => c.active !== false);
  const [chosen, setChosen] = useState(activeCategories[0]?.name ?? '');
  const [priority, setPriority] = useState(activeCategories[0]?.priority ?? 'Medium');
  const activeProjects = projects.filter((p) => p.active);
  const [project, setProject] = useState(
    activeProjects.find((p) => p.id === projectId)?.id ?? activeProjects[0]?.id ?? ''
  );
  const fixedProject = activeProjects.find((p) => p.id === projectId);
  const available = publicForm
    ? !!fixedProject
    : activeCategories.length > 0 && activeProjects.length > 0;
  return (
    <form onSubmit={onSubmit} className="form-stack ticket-form-v2">
      <input type="hidden" name="submissionMode" value={publicForm ? 'public' : 'team'} />
      {publicForm && fixedProject && (
        <div className="public-project-heading">
          <span className="project-heading-mark">
            <Layers3 size={18} />
          </span>
          <div>
            <span className="eyebrow">FORM LAPORAN</span>
            <h2>{fixedProject.name}</h2>
            <p>{fixedProject.description || 'Sampaikan kendala Anda kepada tim support.'}</p>
          </div>
        </div>
      )}
      <div className="form-section-label">
        <span>01</span> Tentang laporan Anda
      </div>
      <label>
        Judul laporan
        <input
          name="title"
          required
          minLength={5}
          maxLength={140}
          placeholder="Ringkas kendala yang Anda alami"
        />
      </label>
      <label>
        Deskripsi
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={10000}
          rows={4}
          placeholder="Apa yang terjadi? Jelaskan langkah dan hasil yang Anda harapkan…"
        />
      </label>
      {publicForm ? (
        <input type="hidden" name="project" value={fixedProject?.id ?? ''} />
      ) : (
        <>
          <label>
            Project / produk
            <Select
              name="project"
              required
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="project-form-note">
            <Layers3 size={14} />
            {activeProjects.find((p) => p.id === project)?.description}
          </div>
        </>
      )}
      {!publicForm && (
        <>
          <label>
            Kategori masalah
            <Select
              name="category"
              required
              value={chosen}
              onChange={(e) => {
                const category = activeCategories.find((item) => item.name === e.target.value);
                setChosen(e.target.value);
                setPriority(category?.priority ?? 'Medium');
              }}
            >
              {activeCategories.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </Select>
          </label>
          <label>
            Prioritas
            <Select
              name="priority"
              required
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {['Urgent', 'High', 'Medium', 'Low'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
        </>
      )}
      <fieldset className="impact-options">
        <legend>
          Seberapa besar dampaknya? <span>Opsional</span>
        </legend>
        {impacts.map((impact, i) => (
          <label key={impact}>
            <input type="radio" name="impact" value={impact} />
            <span>
              <strong>{impact}</strong>
              <small>
                {
                  [
                    'Pekerjaan terhenti dan tidak ada cara alternatif.',
                    'Sebagian pekerjaan masih dapat dilanjutkan.',
                    'Tidak menghambat aktivitas operasional.',
                  ][i]
                }
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="upload">
        <Paperclip size={21} />
        <strong>Tambahkan lampiran</strong>
        <span>PNG, JPG, WebP, PDF · Maks. 5 MB per file</span>
        <input
          name="attachments"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
        />
      </label>
      <div className="form-section-label">
        <span>02</span> Ke mana kami bisa menghubungi Anda?
      </div>
      <div className="form-row">
        <label>
          Nama lengkap
          <input name="name" required maxLength={80} placeholder="Nama Anda" />
        </label>
        <label>
          Alamat email
          <input name="email" type="email" required placeholder="nama@perusahaan.com" />
        </label>
      </div>
      <p className="muted small-text">
        Tidak perlu akun. Setelah laporan dibuat, simpan link pribadi yang tersedia untuk melacak
        progres tiket Anda.
      </p>
      {!available && (
        <p role="alert" className="error-text">
          Link laporan tidak tersedia atau layanan sedang nonaktif. Hubungi administrator untuk
          mendapatkan link yang benar.
        </p>
      )}
      <button className="primary" type="submit" disabled={!available}>
        <Send size={16} /> Kirim laporan
      </button>
    </form>
  );
}
