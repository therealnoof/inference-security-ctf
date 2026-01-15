// =============================================================================
// Chat API Endpoint - Proxy for LLM requests
// =============================================================================
// Proxies LLM requests using system API keys when configured.
// This allows regular users to use the platform without seeing the actual keys.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getKV } from '@/lib/cloudflare';
import { updateUserActivity } from '@/lib/auth-service';

const CONFIG_KEY = 'ctf:system-config';

interface SystemConfig {
  enabled: boolean;
  defaultProvider: 'anthropic' | 'openai' | 'xai';
  anthropicKey?: string;
  openaiKey?: string;
  xaiKey?: string;
}

interface ChatRequest {
  systemPrompt: string;
  userMessage: string;
  provider?: 'anthropic' | 'openai' | 'xai';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // User's own API key (optional - system key will be used if not provided)
  apiKey?: string;
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

    // Verify token is valid and extract userId
    let userId: string | undefined;
    try {
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now()) {
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        );
      }
      userId = payload.userId;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Update user activity timestamp
    if (userId) {
      const kv = getKV();
      updateUserActivity(kv, userId).catch(console.error);
    }

    const body: ChatRequest = await request.json();
    const { systemPrompt, userMessage, provider, model, temperature = 0.7, maxTokens = 1024, apiKey } = body;

    if (!systemPrompt || !userMessage) {
      return NextResponse.json(
        { error: 'systemPrompt and userMessage are required' },
        { status: 400 }
      );
    }

    // Determine which API key to use
    let effectiveApiKey = apiKey;
    let effectiveProvider = provider || 'anthropic';

    // If no user key provided, try to use system key
    if (!effectiveApiKey || effectiveApiKey.length === 0) {
      const kv = getKV();
      const configStr = await kv.get(CONFIG_KEY);

      if (configStr) {
        const config: SystemConfig = JSON.parse(configStr);

        if (config.enabled) {
          effectiveProvider = config.defaultProvider;
          if (config.defaultProvider === 'anthropic') {
            effectiveApiKey = config.anthropicKey;
          } else if (config.defaultProvider === 'openai') {
            effectiveApiKey = config.openaiKey;
          } else if (config.defaultProvider === 'xai') {
            effectiveApiKey = config.xaiKey;
          }
        }
      }
    }

    if (!effectiveApiKey || effectiveApiKey.length === 0) {
      return NextResponse.json(
        { error: 'No API key available. Please configure your API key or contact the administrator.' },
        { status: 400 }
      );
    }

    // Make the LLM request
    if (effectiveProvider === 'anthropic') {
      const effectiveModel = model || 'claude-sonnet-4-20250514';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: effectiveModel,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userMessage }
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(
          { error: error.error?.message || `Anthropic API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const textContent = data.content?.find((block: any) => block.type === 'text');
      const text = textContent?.text || '';

      return NextResponse.json({
        content: text,
        model: effectiveModel,
        provider: 'anthropic',
      });
    } else if (effectiveProvider === 'openai') {
      // OpenAI request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `OpenAI API error: ${error}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      return NextResponse.json({
        content: text,
        model: model || 'gpt-4o',
        provider: 'openai',
      });
    } else if (effectiveProvider === 'xai') {
      // xAI (Grok) request - uses OpenAI-compatible format
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          model: model || 'grok-3-fast',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `xAI API error: ${error}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      return NextResponse.json({
        content: text,
        model: model || 'grok-3-fast',
        provider: 'xai',
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${effectiveProvider}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: `Failed to process chat request: ${error}` },
      { status: 500 }
    );
  }
}
