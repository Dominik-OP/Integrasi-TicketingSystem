import { adminClient } from '@/lib/insforge/server';
import {
  parseReporterAction,
  reporterActionError,
  trackingTokenHash,
} from '@/lib/reporter-actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseReporterAction(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const hash = trackingTokenHash(parsed.token);
  const database = adminClient().database;
  const { value } = parsed;
  const { error } =
    value.action === 'reply'
      ? await database.rpc('add_reporter_comment', { p_token_hash: hash, p_body: value.body })
      : value.action === 'confirm'
        ? await database.rpc('confirm_ticket_resolution', {
            p_token_hash: hash,
            p_resolved: value.resolved,
            p_note: value.note || null,
          })
        : await database.rpc('submit_ticket_feedback', {
            p_token_hash: hash,
            p_rating: value.rating,
            p_comment: value.comment || null,
          });
  if (error) {
    const mapped = reporterActionError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json({ ok: true });
}
