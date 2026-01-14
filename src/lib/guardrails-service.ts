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
 * Default F5 Guardrails API endpoint
 * Users can override this if they have a custom deployment
 */
const DEFAULT_ENDPOINT = 'https://api.calypsoai.com/v1/guardrails';

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

  const endpoint = config.endpoint || DEFAULT_ENDPOINT;

  try {
    const response = await fetch(`${endpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-API-Key': config.apiKey,  // Some endpoints use this header
      },
      body: JSON.stringify({
        content: request.prompt,
        response_content: request.response,
        analysis_type: request.checkType,
        // Request all available analysis
        enable_prompt_injection_detection: true,
        enable_jailbreak_detection: true,
        enable_sensitive_data_detection: true,
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
    
    // Parse the response based on F5/CalypsoAI format
    return parseGuardrailsResponse(data);
    
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
 * Parse the F5 Guardrails API response into our standard format
 * The actual API response format may vary based on your F5 setup
 */
function parseGuardrailsResponse(data: any): GuardrailsResponse {
  // Check for blocked status (API might use different field names)
  const isBlocked = 
    data.blocked === true ||
    data.is_blocked === true ||
    data.action === 'block' ||
    data.status === 'blocked' ||
    (data.risk_score && data.risk_score > 0.7);

  // Extract categories of detected issues
  const categories: string[] = [];
  
  if (data.prompt_injection_detected || data.detections?.prompt_injection) {
    categories.push('prompt_injection');
  }
  if (data.jailbreak_detected || data.detections?.jailbreak) {
    categories.push('jailbreak');
  }
  if (data.sensitive_data_detected || data.detections?.sensitive_data) {
    categories.push('sensitive_data');
  }
  if (data.policy_violation || data.detections?.policy_violation) {
    categories.push('policy_violation');
  }

  // Build reason string
  let reason: string | undefined;
  if (isBlocked) {
    if (categories.length > 0) {
      reason = `Blocked: ${categories.join(', ')}`;
    } else {
      reason = data.reason || data.message || 'Content blocked by guardrails';
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

  const endpoint = config.endpoint || DEFAULT_ENDPOINT;

  try {
    // Try a health check endpoint first
    const healthResponse = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'X-API-Key': config.apiKey,
      },
    });

    if (healthResponse.ok) return true;

    // If no health endpoint, try a minimal analyze request
    const testResponse = await fetch(`${endpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify({
        content: 'Hello, this is a connection test.',
        analysis_type: 'input',
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
