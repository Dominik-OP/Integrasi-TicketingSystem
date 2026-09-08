import { createAuthActions } from '@insforge/sdk/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const auth = createAuthActions({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    requestCookies: await cookies(),
    responseCookies: response.cookies,
  });
  await auth.signOut();
  return response;
}
