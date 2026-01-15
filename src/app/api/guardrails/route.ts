// =============================================================================
// Guardrails API Proxy Route
// =============================================================================
// Proxies requests to CalypsoAI/F5 Guardrails to avoid CORS issues
// Supports both user-provided keys and admin system keys
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKV } from '@/lib/cloudflare';

const DEFAULT_ENDPOINT = 'https://www.us1.calypsoai.app/backend/v1/scans';
const CONFIG_KEY = 'ctf:system-config';

interface GuardrailsRequest {
  input: string;
  apiKey?: string;  // Optional - will use system key if not provided
  endpoint?: string;
}

interface SystemConfig {
  enabled: boolean;
  guardrailsKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body: GuardrailsRequest = await request.json();
    const { input, endpoint } = body;
    let { apiKey } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'input is required' },
        { status: 400 }
      );
    }

    // If no user key provided, try to use system key
    if (!apiKey || apiKey.length === 0) {
      const kv = getKV();
      const configStr = await kv.get(CONFIG_KEY);

      if (configStr) {
        const config: SystemConfig = JSON.parse(configStr);
        if (config.enabled && config.guardrailsKey) {
          apiKey = config.guardrailsKey;
        }
      }
    }

    if (!apiKey || apiKey.length === 0) {
      return NextResponse.json(
        { error: 'No guardrails API key available. Configure in settings or contact administrator.' },
        { status: 400 }
      );
    }

    const guardrailsEndpoint = endpoint || DEFAULT_ENDPOINT;

    // Call CalypsoAI API
    const response = await fetch(guardrailsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input,
        model: 'default',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Guardrails API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Guardrails API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Parse the CalypsoAI response
    const outcome = data.result?.outcome || data.outcome;
    const isBlocked = outcome === 'flagged';

    return NextResponse.json({
      allowed: !isBlocked,
      blocked: isBlocked,
      outcome,
      reason: data.reason || data.message,
      categories: data.categories,
    });

  } catch (error) {
    console.error('Guardrails proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to check with guardrails' },
      { status: 500 }
    );
  }
}
