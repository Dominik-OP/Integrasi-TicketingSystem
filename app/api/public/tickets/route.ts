/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomBytes, randomUUID } from 'crypto';
import { adminClient, currentMember } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const form = contentType.includes('multipart/form-data') ? await request.formData() : null;
  const files =
    form
      ?.getAll('attachments')
      .filter((item): item is File => item instanceof File && item.size > 0) ?? [];
  const input: Record<string, any> = form
    ? Object.fromEntries(form.entries())
    : await request.json().catch(() => ({}));
  const projectSlug = String(input.project ?? '').trim();
  const reporterName = String(input.name ?? '').trim();
  const reporterEmail = String(input.email ?? '')
    .trim()
    .toLowerCase();
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  const impact = String(input.impact ?? '').trim();
  if (
    !projectSlug ||
    title.length < 5 ||
    description.length < 10 ||
    !reporterName ||
    !/^\S+@\S+\.\S+$/.test(reporterEmail)
  ) {
    return NextResponse.json({ error: 'Lengkapi data laporan dengan benar.' }, { status: 400 });
  }

  if (files.length > 5) {
    return NextResponse.json({ error: 'Maksimal 5 lampiran per laporan.' }, { status: 400 });
  }
  if (files.length) {
    if (files.some((file) => file.size > 5 * 1024 * 1024 || !allowedMimes.has(file.type))) {
      return NextResponse.json(
        { error: 'Lampiran harus PNG, JPG, WebP, atau PDF maksimal 5 MB.' },
        { status: 400 }
      );
    }
  }

  const trackingToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(trackingToken).digest('hex');
  const member = await currentMember();
  const admin = adminClient();
  const { data, error } = await admin.database.rpc('create_ticket', {
    p_project_slug: projectSlug,
    p_category_id: null,
    p_reporter_name: reporterName,
    p_reporter_email: reporterEmail,
    p_title: title,
    p_description: description,
    p_impact: impact,
    p_tracking_token_hash: tokenHash,
    p_tracking_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    p_idempotency_key: request.headers.get('idempotency-key') || randomUUID(),
    p_created_by_user_id: member?.user.id ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const ticket = Array.isArray(data) ? data[0] : data;
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  const attachmentResults = await Promise.all(
    files.map(async (file) => {
      const originalName = file.name
        .replaceAll('/', '_')
        .replaceAll('\\', '_')
        .replace(/[^a-zA-Z0-9._() -]/g, '_')
        .slice(0, 255);
      const key = `tickets/${ticket.id}/${randomUUID()}.${extensions[file.type]}`;
      const upload = await admin.storage.from('ticket-attachments').upload(key, file);
      if (upload.error || !upload.data?.key || !upload.data.url) {
        return { ok: false as const, name: originalName };
      }
      const { error: metadataError } = await admin.database.from('attachments').insert([
        {
          ticket_id: ticket.id,
          uploaded_by_user_id: member?.user.id ?? null,
          original_filename: originalName,
          storage_bucket: 'ticket-attachments',
          storage_key: upload.data.key,
          storage_url: upload.data.url,
          mime_type: file.type,
          size_bytes: file.size,
          visibility: 'public',
          upload_status: 'ready',
        },
      ]);
      if (metadataError) {
        await admin.storage.from('ticket-attachments').remove(upload.data.key);
        return { ok: false as const, name: originalName };
      }
      return { ok: true as const, name: originalName };
    })
  );
  const savedAttachments = attachmentResults
    .filter((item) => item.ok)
    .map((item) => ({ name: item.name }));
  const failedAttachments = attachmentResults.filter((item) => !item.ok).length;
  return NextResponse.json(
    {
      ticket: {
        databaseId: ticket.id,
        version: ticket.version,
        id: ticket.ticket_number,
        projectId: projectSlug,
        trackingToken,
        title: ticket.title,
        description: ticket.description,
        impact: ticket.impact,
        name: ticket.reporter_name,
        email: ticket.reporter_email,
        category: ticket.category_name_snapshot,
        priority: 'Medium',
        status: 'New / Open',
        agent: '',
        reviewer: '',
        created: ticket.created_at,
        updated: ticket.updated_at,
        attachments: savedAttachments,
        history: [
          {
            text: 'Tiket dibuat oleh pelapor',
            at: ticket.created_at,
            actorName: reporterName,
            actorRole: 'Pelapor',
          },
        ],
        comments: [],
      },
      ...(failedAttachments
        ? {
            attachmentWarning: `${failedAttachments} lampiran gagal diunggah. Tiket tetap berhasil dibuat.`,
          }
        : {}),
    },
    { status: 201 }
  );
}
