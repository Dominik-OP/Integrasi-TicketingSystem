import { adminClient, currentMember } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const context = await currentMember();
  if (!context) return NextResponse.json({ user: null }, { status: 401 });
  const { data: role } = await adminClient()
    .database.from('roles')
    .select('id, name, access_level_key')
    .eq('id', context.member.role_id)
    .maybeSingle();
  return NextResponse.json({
    user: {
      id: context.member.user_id,
      name: context.member.display_name,
      email: context.member.email,
      roleId: context.member.role_id,
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
