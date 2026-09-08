/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminClient } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await adminClient()
    .database.from('projects')
    .select('id, slug, name, ticket_prefix, description, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    projects: (data ?? []).map((project: any) => ({
      id: project.slug,
      databaseId: project.id,
      name: project.name,
      prefix: project.ticket_prefix,
      description: project.description,
      active: project.is_active,
    })),
  });
}
