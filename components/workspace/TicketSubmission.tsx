'use client';
import TicketForm from '@/components/forms/ticket-form';
import type { Category, Ticket } from '@/lib/domain';
import type { Project } from '@/lib/projects';
import { useState } from 'react';

const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

/** Ticket form wired to the submission API, for the public portal and the team "Buat tiket" dialog. */
export default function TicketSubmission({
  publicForm,
  projectId,
  projects,
  categories,
  notify,
  onCreated,
}: {
  publicForm: boolean;
  projectId: string;
  projects: Project[];
  categories: Category[];
  notify: (message: string) => void;
  onCreated: (ticket: Ticket, projectId: string) => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <TicketForm
      categories={categories}
      projects={projects}
      projectId={projectId}
      publicForm={publicForm}
      submitting={submitting}
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;
        const fd = new FormData(e.currentTarget);
        const files = fd
          .getAll('attachments')
          .filter((f): f is File => f instanceof File && !!f.name);
        const project = projects.find(
          (p) => p.id === (publicForm ? projectId : fd.get('project')) && p.active
        );
        const chosenCategory = categories.find(
          (c) => c.name === fd.get('category') && c.active !== false
        );
        if (!project || (!publicForm && !chosenCategory)) return;
        if (
          !['title', 'description', 'name', 'email'].every((key) =>
            String(fd.get(key) ?? '').trim()
          )
        ) {
          notify('Lengkapi data laporan.');
          return;
        }
        if (
          files.some((file) => file.size > 5 * 1024 * 1024 || !allowedTypes.includes(file.type))
        ) {
          notify('Lampiran harus PNG, JPG, WebP, atau PDF maksimal 5 MB per file.');
          return;
        }
        fd.set('project', project.id);
        setSubmitting(true);
        try {
          const response = await fetch('/api/public/tickets', {
            method: 'POST',
            headers: { 'idempotency-key': crypto.randomUUID() },
            body: fd,
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error ?? 'Laporan gagal disimpan.');
          if (result.attachmentWarning) notify(result.attachmentWarning);
          await onCreated(result.ticket, project.id);
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Laporan gagal disimpan.');
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}
