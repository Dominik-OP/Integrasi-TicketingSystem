import { statusValues } from '@/lib/insforge/mapping';
import { adminClient, currentMember } from '@/lib/insforge/server';
import type { Status } from '@/lib/demo';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await currentMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const admin = adminClient();
  let result: { data: unknown; error: { message: string } | null };

  if (body.action === 'comment') {
    result = await admin.database.rpc('add_ticket_comment', {
      p_ticket_id: id,
      p_actor_user_id: auth.user.id,
      p_body: String(body.body ?? ''),
      p_visibility: body.visibility === 'internal' ? 'internal' : 'public',
    });
  } else if (body.action === 'assign') {
    result = await admin.database.rpc('assign_ticket', {
      p_ticket_id: id,
      p_expected_version: Number(body.expectedVersion),
      p_actor_user_id: auth.user.id,
      p_reviewer_user_id: body.reviewer || null,
      p_agent_user_id: body.agent || null,
      p_priority: String(body.priority ?? 'Medium').toLowerCase(),
    });
  } else if (body.action === 'transition') {
    const status = statusValues[body.status as Status];
    if (!status) return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });
    result = await admin.database.rpc('transition_ticket', {
      p_ticket_id: id,
      p_expected_version: Number(body.expectedVersion),
      p_actor_user_id: auth.user.id,
      p_new_status: status,
      p_reason: body.reason || null,
      p_resolution_cause: body.resolution?.cause || null,
      p_resolution_fix: body.resolution?.fix || null,
      p_resolution_impact: body.resolution?.impact || null,
      p_resolution_steps: body.resolution?.reporterSteps || null,
      p_resolution_internal_reference: body.resolution?.internalNotes || null,
    });
  } else {
    return NextResponse.json({ error: 'Aksi tidak didukung.' }, { status: 400 });
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
