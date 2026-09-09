/* eslint-disable */
// @ts-nocheck -- This file runs in InsForge's Deno runtime, outside the Next.js TypeScript graph.
import { createAdminClient } from 'npm:@insforge/sdk';

const SUPPORTED_EVENTS = new Set([
  'ticket_created',
  'public_reply_added',
  'ticket_resolved',
  'ticket_closed',
]);
const encoder = new TextEncoder();

function required(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value: string) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function deliveryKey(eventId: string, audience: string, email: string) {
  return `ticket-email/${eventId}/${audience}/${(await sha256(email.toLowerCase())).slice(0, 16)}`;
}

function paragraph(value: unknown) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

function layout(title: string, intro: string, content: string, actionUrl: string, action: string) {
  return `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f5f7f2;font-family:Arial,sans-serif;color:#17352d">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <div style="background:#fff;border:1px solid #dce5d8;border-radius:16px;padding:28px">
        <div style="font-size:12px;letter-spacing:.14em;color:#6d806e;margin-bottom:12px">INTEGRASI SUPPORT</div>
        <h1 style="font-size:24px;line-height:1.3;margin:0 0 12px">${escapeHtml(title)}</h1>
        <p style="font-size:15px;line-height:1.7;margin:0 0 22px;color:#52675d">${escapeHtml(intro)}</p>
        ${content}
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:24px;padding:12px 18px;border-radius:9px;background:#245d49;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(action)}</a>
        <p style="font-size:12px;line-height:1.6;margin:24px 0 0;color:#819086">Jangan bagikan link pribadi pelacakan tiket kepada pihak lain.</p>
      </div>
    </div>
  </body>
</html>`;
}

function detailRows(rows: Array<[string, unknown]>) {
  return `<div style="border:1px solid #e2e8df;border-radius:12px;overflow:hidden">${rows
    .filter(([, value]) => String(value ?? '').trim())
    .map(
      ([label, value]) =>
        `<div style="padding:11px 14px;border-bottom:1px solid #eef2ec"><strong>${escapeHtml(label)}</strong><br><span style="color:#52675d;line-height:1.6">${paragraph(value)}</span></div>`
    )
    .join('')}</div>`;
}

function reporterMessage(snapshot: any, trackingUrl: string) {
  const number = snapshot.ticketNumber;
  if (snapshot.eventType === 'ticket_created') {
    return {
      subject: `[${number}] Laporan Anda sudah diterima`,
      text: `Laporan ${number} sudah diterima. Pantau progres: ${trackingUrl}`,
      html: layout(
        'Laporan sudah diterima',
        `Nomor tiket Anda: ${number}`,
        detailRows([
          ['Project', snapshot.projectName],
          ['Judul', snapshot.title],
          ['Status', 'New / Open'],
        ]),
        trackingUrl,
        'Lacak tiket'
      ),
    };
  }
  if (snapshot.eventType === 'public_reply_added') {
    return {
      subject: `[${number}] Ada balasan baru`,
      text: `Tim support membalas tiket ${number}: ${snapshot.commentBody}\n\n${trackingUrl}`,
      html: layout(
        'Balasan baru dari tim support',
        `Ada pembaruan untuk tiket ${number}.`,
        detailRows([['Balasan', snapshot.commentBody]]),
        trackingUrl,
        'Lihat balasan'
      ),
    };
  }
  if (snapshot.eventType === 'ticket_resolved') {
    return {
      subject: `[${number}] Tiket sudah diselesaikan`,
      text: `Tiket ${number} sudah diselesaikan. Pantau detail: ${trackingUrl}`,
      html: layout(
        'Tiket sudah diselesaikan',
        `Tim support telah menyelesaikan tiket ${number}.`,
        detailRows([
          ['Penyebab', snapshot.resolutionCause],
          ['Perbaikan', snapshot.resolutionFix],
          ['Dampak/perubahan', snapshot.resolutionImpact],
          ['Langkah Anda', snapshot.resolutionSteps],
        ]),
        trackingUrl,
        'Lihat penyelesaian'
      ),
    };
  }
  return {
    subject: `[${number}] Tiket sudah ditutup`,
    text: `Tiket ${number} sudah ditutup. Pantau arsip tiket: ${trackingUrl}`,
    html: layout(
      'Tiket sudah ditutup',
      `Proses tiket ${number} telah selesai dan ditutup.`,
      detailRows([
        ['Judul', snapshot.title],
        ['Alasan penutupan', snapshot.closedReason],
      ]),
      trackingUrl,
      'Lihat tiket'
    ),
  };
}

function teamMessage(snapshot: any, dashboardUrl: string) {
  return {
    subject: `[Tiket baru ${snapshot.ticketNumber}] ${snapshot.title}`,
    text: `Tiket baru ${snapshot.ticketNumber} dari ${snapshot.reporterName}. Buka dashboard: ${dashboardUrl}`,
    html: layout(
      'Tiket baru masuk',
      `${snapshot.ticketNumber} menunggu triase.`,
      detailRows([
        ['Project', snapshot.projectName],
        ['Pelapor', `${snapshot.reporterName} (${snapshot.reporterEmail})`],
        ['Judul', snapshot.title],
        ['Deskripsi', snapshot.description],
        ['Dampak', snapshot.impact],
      ]),
      dashboardUrl,
      'Buka dashboard'
    ),
  };
}

async function createSnapshot(admin: any, event: any) {
  const { data: ticket, error: ticketError } = await admin.database
    .from('tickets')
    .select(
      'id, project_id, ticket_number, reporter_name, reporter_email, title, description, impact, resolution_cause, resolution_fix, resolution_impact, resolution_steps, closed_reason'
    )
    .eq('id', event.aggregate_id)
    .maybeSingle();
  if (ticketError || !ticket) throw new Error(ticketError?.message ?? 'Ticket not found');

  const { data: project, error: projectError } = await admin.database
    .from('projects')
    .select('name')
    .eq('id', ticket.project_id)
    .maybeSingle();
  if (projectError || !project) throw new Error(projectError?.message ?? 'Project not found');

  let commentBody = '';
  if (event.event_type === 'public_reply_added') {
    const commentId = String(event.payload?.comment_id ?? '');
    const { data: comment, error: commentError } = await admin.database
      .from('comments')
      .select('body, visibility')
      .eq('id', commentId)
      .eq('ticket_id', ticket.id)
      .maybeSingle();
    if (commentError || !comment || comment.visibility !== 'public') {
      throw new Error(commentError?.message ?? 'Public comment not found');
    }
    commentBody = comment.body;
  }

  let teamEmails: string[] = [];
  if (event.event_type === 'ticket_created') {
    const { data: roles, error: rolesError } = await admin.database
      .from('roles')
      .select('id')
      .eq('is_active', true)
      .in('access_level_key', ['admin', 'reviewer']);
    if (rolesError) throw new Error(rolesError.message);
    const roleIds = (roles ?? []).map((role: any) => role.id);
    if (roleIds.length) {
      const { data: members, error: membersError } = await admin.database
        .from('team_members')
        .select('email')
        .eq('is_active', true)
        .in('role_id', roleIds);
      if (membersError) throw new Error(membersError.message);
      teamEmails = [
        ...new Set(
          (members ?? [])
            .map((member: any) => String(member.email).trim().toLowerCase())
            .filter((email: string) => email && email !== ticket.reporter_email)
        ),
      ];
    }
  }

  return {
    eventType: event.event_type,
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    reporterName: ticket.reporter_name,
    reporterEmail: ticket.reporter_email,
    title: ticket.title,
    description: ticket.description,
    impact: ticket.impact,
    projectName: project.name,
    commentBody,
    resolutionCause: ticket.resolution_cause,
    resolutionFix: ticket.resolution_fix,
    resolutionImpact: ticket.resolution_impact,
    resolutionSteps: ticket.resolution_steps,
    closedReason: ticket.closed_reason,
    teamEmails,
  };
}

async function getSnapshot(admin: any, event: any) {
  if (event.payload?.email_snapshot) return event.payload.email_snapshot;
  const snapshot = await createSnapshot(admin, event);
  const { error } = await admin.database
    .from('outbox_events')
    .update({ payload: { ...(event.payload ?? {}), email_snapshot: snapshot } })
    .eq('id', event.id)
    .eq('locked_by', event.locked_by);
  if (error) throw new Error(error.message);
  return snapshot;
}

async function ensureTrackingUrl(admin: any, eventId: string, snapshot: any, appUrl: string) {
  const secret = required('TRACKING_TOKEN_SECRET');
  const token = await hmacSha256(
    secret,
    `${eventId}:${snapshot.ticketId}:${snapshot.reporterEmail}`
  );
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.database.from('tracking_grants').upsert(
    [
      {
        ticket_id: snapshot.ticketId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    ],
    { onConflict: 'token_hash', ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
  return `${appUrl}/track/${token}`;
}

async function saveDelivery(admin: any, values: Record<string, unknown>) {
  const { error } = await admin.database
    .from('email_deliveries')
    .upsert([values], { onConflict: 'provider_idempotency_key' });
  if (error) throw new Error(error.message);
}

async function sendEmail(
  admin: any,
  event: any,
  recipient: string,
  audience: string,
  message: { subject: string; html: string; text: string }
) {
  const idempotencyKey = await deliveryKey(event.id, audience, recipient);
  const { data: existing, error: existingError } = await admin.database
    .from('email_deliveries')
    .select('status, provider_message_id')
    .eq('provider_idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.status === 'sent' || existing?.status === 'delivered') return 'skipped';

  const baseDelivery = {
    outbox_event_id: event.id,
    recipient_email: recipient,
    provider: 'resend',
    provider_message_id: existing?.provider_message_id ?? null,
    provider_idempotency_key: idempotencyKey,
    status: 'queued',
    attempt_number: event.attempt_count,
    error_code: null,
    error_message: null,
    sent_at: null,
  };
  await saveDelivery(admin, baseDelivery);

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${required('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: required('EMAIL_FROM'),
        to: [recipient],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(Deno.env.get('EMAIL_REPLY_TO')?.trim()
          ? { reply_to: Deno.env.get('EMAIL_REPLY_TO')!.trim() }
          : {}),
      }),
    });
  } catch (error) {
    await saveDelivery(admin, {
      ...baseDelivery,
      status: 'unknown',
      error_code: 'network_error',
      error_message: String(error).slice(0, 1000),
    });
    throw error;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.id) {
    const messageText = String(body?.message ?? `Resend HTTP ${response.status}`).slice(0, 1000);
    await saveDelivery(admin, {
      ...baseDelivery,
      status: 'failed',
      error_code: String(body?.name ?? response.status),
      error_message: messageText,
    });
    throw new Error(messageText);
  }

  await saveDelivery(admin, {
    ...baseDelivery,
    provider_message_id: body.id,
    status: 'sent',
    sent_at: new Date().toISOString(),
  });
  return 'sent';
}

async function processEvent(admin: any, event: any, appUrl: string) {
  if (!SUPPORTED_EVENTS.has(event.event_type)) {
    throw new Error(`Unsupported outbox event: ${event.event_type}`);
  }
  const snapshot = await getSnapshot(admin, event);
  const trackingUrl = await ensureTrackingUrl(admin, event.id, snapshot, appUrl);
  const reporter = reporterMessage(snapshot, trackingUrl);
  const results = [await sendEmail(admin, event, snapshot.reporterEmail, 'reporter', reporter)];

  if (event.event_type === 'ticket_created') {
    const dashboardUrl = `${appUrl}/tickets`;
    const team = teamMessage(snapshot, dashboardUrl);
    for (const email of snapshot.teamEmails) {
      results.push(await sendEmail(admin, event, email, 'team', team));
    }
  }
  return results;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const expectedToken = required('EMAIL_WORKER_TOKEN');
  const suppliedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!secureEqual(suppliedToken, expectedToken)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient({
    baseUrl: required('INSFORGE_BASE_URL'),
    apiKey: required('API_KEY'),
  });
  const workerId = crypto.randomUUID();
  const appUrl = stripTrailingSlash(required('APP_URL'));
  const { data: events, error: claimError } = await admin.database.rpc('claim_email_outbox', {
    p_worker_id: workerId,
    p_limit: 10,
  });
  if (claimError) return Response.json({ error: claimError.message }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const event of events ?? []) {
    try {
      const results = await processEvent(admin, event, appUrl);
      sent += results.filter((result) => result === 'sent').length;
      const { error } = await admin.database.rpc('complete_email_outbox', {
        p_event_id: event.id,
        p_worker_id: workerId,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      failed += 1;
      await admin.database.rpc('fail_email_outbox', {
        p_event_id: event.id,
        p_worker_id: workerId,
        p_error: String(error).slice(0, 1000),
      });
    }
  }

  return Response.json({ claimed: events?.length ?? 0, sent, failed });
}
