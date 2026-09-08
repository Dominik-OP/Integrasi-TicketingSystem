/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadWorkspaceRaw } from '@/lib/insforge/data';
import { mapWorkspace } from '@/lib/insforge/mapping';
import { adminClient, currentMember, serverClient } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!(await currentMember()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const raw = await loadWorkspaceRaw(await serverClient());
    const keys = raw.attachments
      .filter((item: any) => item.upload_status === 'ready' && item.storage_key)
      .map((item: any) => item.storage_key as string);
    const { data: signed } = keys.length
      ? await adminClient().storage.from('ticket-attachments').createSignedUrls(keys, 900)
      : { data: [] };
    const urls = Object.fromEntries(
      (signed ?? [])
        .filter((item) => item.signedUrl)
        .map((item) => [item.path, item.signedUrl as string])
    );
    return NextResponse.json(mapWorkspace(raw, urls));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Workspace tidak dapat dimuat.' },
      { status: 500 }
    );
  }
}
