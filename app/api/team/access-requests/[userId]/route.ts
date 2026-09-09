import { adminClient, currentMember, hasServerPermission } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await currentMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [canManageUsers, canManageRoles] = await Promise.all([
    hasServerPermission(auth.user.id, 'manage_users'),
    hasServerPermission(auth.user.id, 'manage_roles'),
  ]);
  if (!canManageUsers || !canManageRoles) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision =
    body.decision === 'approve' ? 'approved' : body.decision === 'reject' ? 'rejected' : '';
  const roleId = typeof body.roleId === 'string' ? body.roleId : null;
  if (
    !uuidPattern.test(userId) ||
    !decision ||
    (decision === 'approved' && !uuidPattern.test(roleId ?? ''))
  ) {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const { data, error } = await adminClient().database.rpc('review_team_access_request', {
    p_actor_user_id: auth.user.id,
    p_request_user_id: userId,
    p_decision: decision,
    p_role_id: decision === 'approved' ? roleId : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data });
}
