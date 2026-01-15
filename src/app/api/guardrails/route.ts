// =============================================================================
// Guardrails API Proxy Route
// =============================================================================
// Proxies requests to CalypsoAI/F5 Guardrails to avoid CORS issues
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_ENDPOINT = 'https://www.us1.calypsoai.app/backend/v1/scans';

interface GuardrailsRequest {
  input: string;
  apiKey: string;
  endpoint?: string;
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
    const { input, apiKey, endpoint } = body;

    if (!input || !apiKey) {
      return NextResponse.json(
        { error: 'input and apiKey are required' },
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
