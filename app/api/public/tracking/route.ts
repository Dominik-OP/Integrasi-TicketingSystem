/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminClient } from '@/lib/insforge/server';
import { trackingTokenHash } from '@/lib/reporter-actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? '').trim();
  const number = String(body.number ?? '').trim();
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const admin = adminClient();
  let ticketId = '';

  if (token) {
    const hash = trackingTokenHash(token);
    const { data: grant } = await admin.database
      .from('tracking_grants')
      .select('ticket_id')
      .eq('token_hash', hash)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    ticketId = grant?.ticket_id ?? '';
  } else if (number && email) {
    const { data: match } = await admin.database
      .from('tickets')
      .select('id')
      .ilike('ticket_number', number)
      .eq('reporter_email', email)
      .maybeSingle();
    ticketId = match?.id ?? '';
  }
  if (!ticketId) return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });

  const [
    { data: ticket },
    { data: project },
    { data: events },
    { data: comments },
    { data: attachments },
    { data: feedback },
  ] = await Promise.all([
    admin.database.from('tickets').select('*').eq('id', ticketId).single(),
    admin.database.from('projects').select('id, slug, name').limit(100),
    admin.database
      .from('ticket_events')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('visibility', 'public')
      .order('occurred_at'),
    admin.database
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('visibility', 'public')
      .order('created_at'),
    admin.database
      .from('attachments')
      .select('id, original_filename, storage_key, upload_status')
      .eq('ticket_id', ticketId)
      .eq('visibility', 'public')
      .eq('upload_status', 'ready')
      .order('created_at'),
    admin.database
      .from('ticket_feedback')
      .select('rating, comment, submitted_at')
      .eq('ticket_id', ticketId)
      .maybeSingle(),
  ]);
  if (!ticket) return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });
  const projects = Array.isArray(project) ? project : [];
  const projectRow = projects.find((item: any) => item.id === ticket.project_id);
  const attachmentRows = Array.isArray(attachments) ? attachments : [];
  const attachmentKeys = attachmentRows
    .map((item: any) => item.storage_key)
    .filter((key): key is string => typeof key === 'string' && key.length > 0);
  const { data: signedAttachments } = attachmentKeys.length
    ? await admin.storage.from('ticket-attachments').createSignedUrls(attachmentKeys, 900)
    : { data: [] };
  const signedByKey = Object.fromEntries(
    (signedAttachments ?? [])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl as string])
  );
  const labels: Record<string, string> = {
    new: 'New / Open',
    on_review: 'On Review',
    in_progress: 'In Progress',
    waiting_on_user: 'Waiting on User',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return NextResponse.json({
    ticket: {
      databaseId: ticket.id,
      version: ticket.version,
      id: ticket.ticket_number,
      projectId: projectRow?.slug,
      ...(token ? { trackingToken: token } : {}),
      title: ticket.title,
      description: ticket.description,
      impact: ticket.impact,
      name: ticket.reporter_name,
      email: ticket.reporter_email,
      category: ticket.category_name_snapshot,
      priority: String(ticket.priority).replace(/^./, (letter: string) => letter.toUpperCase()),
      status: labels[ticket.status] ?? 'New / Open',
      agent: '',
      reviewer: '',
      created: ticket.created_at,
      updated: ticket.updated_at,
      attachments: attachmentRows.map((item: any) => ({
        name: item.original_filename,
        ...(signedByKey[item.storage_key] ? { url: signedByKey[item.storage_key] } : {}),
      })),
      resolution: ticket.resolution_cause
        ? {
            cause: ticket.resolution_cause,
            fix: ticket.resolution_fix ?? '',
            impact: ticket.resolution_impact ?? '',
            reporterSteps: ticket.resolution_steps ?? '',
            at: ticket.resolved_at ?? ticket.updated_at,
            author: 'Tim support',
            authorRole: 'Support',
          }
        : undefined,
      closure: ticket.closed_reason
        ? {
            reason: ticket.closed_reason,
            at: ticket.closed_at ?? ticket.updated_at,
            author: 'Tim support',
            authorRole: 'Support',
          }
        : undefined,
      feedback: feedback
        ? { rating: feedback.rating, comment: feedback.comment, at: feedback.submitted_at }
        : undefined,
      history: (events ?? []).map((item: any) => ({
        text: item.summary,
        at: item.occurred_at,
        actorName: item.actor_name_snapshot,
        actorRole: item.actor_role_snapshot,
      })),
      comments: (comments ?? []).map((item: any) => ({
        text: item.body,
        at: item.created_at,
        author: item.author_name_snapshot,
        authorRole: item.author_role_snapshot,
        internal: false,
        fromReporter: item.source === 'reporter',
      })),
    },
  });
}
