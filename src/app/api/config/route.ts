// =============================================================================
// System Config API Route
// =============================================================================
// Handles system-wide configuration like admin API keys
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { getKV } from "@/lib/cloudflare";

const CONFIG_KEY = 'ctf:system-config';

interface SystemConfig {
  enabled: boolean;
  defaultProvider: 'anthropic' | 'openai';
  anthropicKey?: string;
  openaiKey?: string;
  guardrailsKey?: string;
  guardrailsEndpoint?: string;
}

// GET /api/config - Get system config (public, but keys are masked)
export async function GET(request: NextRequest) {
  try {
    const kv = getKV();
    const configStr = await kv.get(CONFIG_KEY);

    if (!configStr) {
      return NextResponse.json({
        enabled: false,
        defaultProvider: 'anthropic',
      });
    }

    const config: SystemConfig = JSON.parse(configStr);

    // Return config with masked keys for non-admin requests
    // Check if this is an admin request (has valid auth token with admin role)
    const token = request.cookies.get('auth-token')?.value;
    let isAdmin = false;

    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        isAdmin = payload.role === 'admin' || payload.role === 'superadmin';
      } catch {}
    }

    if (isAdmin) {
      // Return full config for admins
      return NextResponse.json(config);
    }

    // For regular users, just return whether keys are enabled and which provider
    return NextResponse.json({
      enabled: config.enabled,
      defaultProvider: config.defaultProvider,
      hasAnthropicKey: !!config.anthropicKey,
      hasOpenaiKey: !!config.openaiKey,
      hasGuardrailsKey: !!config.guardrailsKey,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

// POST /api/config - Update system config (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let isAdmin = false;
    try {
      const payload = JSON.parse(atob(token));
      isAdmin = payload.role === 'admin' || payload.role === 'superadmin';
    } catch {}

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const kv = getKV();
    const body = await request.json();

    const config: SystemConfig = {
      enabled: body.enabled || false,
      defaultProvider: body.defaultProvider || 'anthropic',
      anthropicKey: body.anthropicKey,
      openaiKey: body.openaiKey,
      guardrailsKey: body.guardrailsKey,
      guardrailsEndpoint: body.guardrailsEndpoint,
    };

    await kv.put(CONFIG_KEY, JSON.stringify(config));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
