// =============================================================================
// F5 Guardrails Service - LLM Security CTF Platform
// =============================================================================
// This module handles integration with F5 AI Guardrails (CalypsoAI).
// It's used for Level 6 of the CTF to demonstrate enterprise-grade AI security.
//
// F5 Guardrails provides:
// - Prompt injection detection
// - Jailbreak attempt blocking
// - Content policy enforcement
// - Real-time threat analysis
// =============================================================================

import { GuardrailsConfig, GuardrailsResponse } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface GuardrailsRequest {
  prompt: string;
  response?: string;
  checkType: 'input' | 'output' | 'both';
}

// -----------------------------------------------------------------------------
// API Integration
// -----------------------------------------------------------------------------

/**
 * Default F5 Guardrails API endpoint (CalypsoAI)
 * Users can override this if they have a custom deployment
 */
const DEFAULT_ENDPOINT = 'https://www.us1.calypsoai.app/backend/v1/scans';

/**
 * Check content with F5 Guardrails
 * 
 * @param config - Guardrails configuration (API key, endpoint)
 * @param request - The content to check
 * @returns Analysis result from F5 Guardrails
 */
export async function checkWithGuardrails(
  config: GuardrailsConfig,
  request: GuardrailsRequest
): Promise<GuardrailsResponse> {
  if (!config.enabled || !config.apiKey) {
    return { allowed: true, blocked: false };
  }

  try {
    // Determine what content to scan based on check type
    let contentToScan = request.prompt;
    if (request.checkType === 'output' && request.response) {
      contentToScan = request.response;
    } else if (request.checkType === 'both') {
      contentToScan = `${request.prompt}\n\n${request.response || ''}`;
    }

    // Use our server-side proxy to avoid CORS issues
    const response = await fetch('/api/guardrails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: contentToScan,
        apiKey: config.apiKey,
        endpoint: config.endpoint || DEFAULT_ENDPOINT,
      }),
    });

    if (!response.ok) {
      console.error('Guardrails API error:', response.status);
      // On API error, fail open (allow) to not block legitimate use
      return {
        allowed: true,
        blocked: false,
        reason: 'Guardrails API unavailable'
      };
    }

    const data = await response.json();

    // Response is already parsed by our proxy
    return {
      allowed: data.allowed,
      blocked: data.blocked,
      reason: data.reason,
      categories: data.categories,
    };

  } catch (error) {
    console.error('Guardrails error:', error);
    return {
      allowed: true,
      blocked: false,
      reason: 'Connection error'
    };
  }
}

/**
 * Parse the CalypsoAI/F5 Guardrails API response into our standard format
 * Response format: { result: { outcome: "flagged" | "cleared" }, reason: "...", categories: [...] }
 */
function parseGuardrailsResponse(data: any): GuardrailsResponse {
  // CalypsoAI returns result.outcome as "flagged" or "cleared"
  const outcome = data.result?.outcome || data.outcome;
  const isBlocked = outcome === 'flagged';

  // Extract categories if available
  const categories: string[] = data.categories || [];

  // Build reason string
  let reason: string | undefined;
  if (isBlocked) {
    reason = data.reason || data.message || 'Content flagged by F5 Guardrails';
    if (categories.length > 0) {
      reason = `${reason} (${categories.join(', ')})`;
    }
  }

  return {
    allowed: !isBlocked,
    blocked: isBlocked,
    reason,
    categories: categories.length > 0 ? categories : undefined,
  };
}

/**
 * Test connection to F5 Guardrails
 * Sends a simple, known-safe request to verify the API key works
 */
export async function testGuardrailsConnection(config: GuardrailsConfig): Promise<boolean> {
  if (!config.apiKey) return false;

  try {
    // Use our server-side proxy to avoid CORS issues
    const testResponse = await fetch('/api/guardrails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Hello, this is a connection test.',
        apiKey: config.apiKey,
        endpoint: config.endpoint || DEFAULT_ENDPOINT,
      }),
    });

    return testResponse.ok;

  } catch (error) {
    console.error('Guardrails connection test failed:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// CTF Integration
// -----------------------------------------------------------------------------

/**
 * Check user input with F5 Guardrails before sending to LLM
 * Used in Level 6 to block jailbreak attempts
 */
export async function checkInputWithGuardrails(
  config: GuardrailsConfig,
  userInput: string
): Promise<{ allowed: boolean; reason?: string }> {
  const result = await checkWithGuardrails(config, {
    prompt: userInput,
    checkType: 'input',
  });

  return {
    allowed: result.allowed,
    reason: result.reason,
  };
}

/**
 * Check LLM output with F5 Guardrails before showing to user
 * Used in Level 6 to catch any leaked secrets
 */
export async function checkOutputWithGuardrails(
  config: GuardrailsConfig,
  userInput: string,
  llmOutput: string
): Promise<{ allowed: boolean; reason?: string }> {
  const result = await checkWithGuardrails(config, {
    prompt: userInput,
    response: llmOutput,
    checkType: 'output',
  });

  return {
    allowed: result.allowed,
    reason: result.reason,
  };
}

/**
 * Full check: both input and output
 * Most comprehensive protection for Level 6
 */
export async function fullGuardrailsCheck(
  config: GuardrailsConfig,
  userInput: string,
  llmOutput: string
): Promise<{
  inputAllowed: boolean;
  outputAllowed: boolean;
  inputReason?: string;
  outputReason?: string;
}> {
  // Check input first
  const inputResult = await checkInputWithGuardrails(config, userInput);
  
  // If input is blocked, don't even check output
  if (!inputResult.allowed) {
    return {
      inputAllowed: false,
      outputAllowed: false,
      inputReason: inputResult.reason,
    };
  }
  
  // Check output
  const outputResult = await checkOutputWithGuardrails(config, userInput, llmOutput);
  
  return {
    inputAllowed: true,
    outputAllowed: outputResult.allowed,
    outputReason: outputResult.reason,
  };
}
