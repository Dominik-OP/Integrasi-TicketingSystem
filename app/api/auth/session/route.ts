import { adminClient, currentUser } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ user: null, accessStatus: 'unauthenticated' }, { status: 401 });
  }

  const admin = adminClient();
  const { data: member } = await admin.database
    .from('team_members')
    .select('user_id, role_id, display_name, email, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member?.is_active) {
    const { data: accessRequest } = await admin.database
      .from('team_access_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    return NextResponse.json({
      user: null,
      accessStatus: member ? 'inactive' : (accessRequest?.status ?? 'unauthorized'),
    });
  }

  const { data: role } = await admin.database
    .from('roles')
    .select('id, name, access_level_key')
    .eq('id', member.role_id)
    .maybeSingle();
  return NextResponse.json({
    accessStatus: 'active',
    user: {
      id: member.user_id,
      name: member.display_name,
      email: member.email,
      roleId: member.role_id,
      role:
        role?.access_level_key === 'admin'
          ? 'Admin'
          : role?.access_level_key === 'reviewer'
            ? 'Reviewer'
            : 'Agent',
      active: true,
    },
  });
}
