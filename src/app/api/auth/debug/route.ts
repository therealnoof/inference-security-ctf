// Debug endpoint to check environment variable availability
// DELETE THIS FILE AFTER DEBUGGING

export const runtime = 'edge';

import { NextResponse } from "next/server";
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET() {
  let cfEnv: any = {};
  let cfEnvKeys: string[] = [];
  let contextError = null;

  try {
    const ctx = getRequestContext();
    cfEnv = ctx.env || {};
    cfEnvKeys = Object.keys(cfEnv);
  } catch (error: any) {
    contextError = error.message;
  }

  return NextResponse.json({
    // Check process.env (may not work in Cloudflare)
    processEnv: {
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'SET' : 'NOT SET',
      AUTH0_ISSUER: process.env.AUTH0_ISSUER ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'SET' : 'NOT SET',
    },
    // Check Cloudflare context
    cloudflareContext: {
      error: contextError,
      availableKeys: cfEnvKeys,
      AUTH0_CLIENT_ID: cfEnv.AUTH0_CLIENT_ID ? 'SET' : 'NOT SET',
      AUTH0_ISSUER: cfEnv.AUTH0_ISSUER ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_AUTH_PROVIDER: cfEnv.NEXT_PUBLIC_AUTH_PROVIDER ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: cfEnv.NEXTAUTH_URL ? 'SET' : 'NOT SET',
    },
  });
}
