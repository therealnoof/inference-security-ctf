// =============================================================================
// Cloudflare Runtime Utilities
// =============================================================================
// Helpers for accessing Cloudflare bindings in Next.js Edge Runtime.
// Includes in-memory fallback for local development.
// =============================================================================

import { getRequestContext } from '@cloudflare/next-on-pages';

// KV Namespace type
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expiration?: number; expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// Cloudflare environment bindings
export interface CloudflareEnv {
  CTF_KV: KVNamespace;
  // Auth0 environment variables
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
  AUTH0_ISSUER?: string;
  NEXTAUTH_URL?: string;
  NEXT_PUBLIC_AUTH_PROVIDER?: string;
  // Admin credentials
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  // Allow any other env vars
  [key: string]: any;
}

// -----------------------------------------------------------------------------
// In-Memory KV Store (for local development)
// -----------------------------------------------------------------------------

const inMemoryStore: Map<string, string> = new Map();

const inMemoryKV: KVNamespace = {
  async get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any> {
    const value = inMemoryStore.get(key);
    if (value === undefined) return null;

    if (options?.type === 'json') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  },

  async put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    inMemoryStore.set(key, stringValue);
  },

  async delete(key: string): Promise<void> {
    inMemoryStore.delete(key);
  },
};

// -----------------------------------------------------------------------------
// KV Access
// -----------------------------------------------------------------------------

/**
 * Get the KV namespace from Cloudflare request context.
 * Falls back to in-memory store for local development.
 */
export function getKV(): KVNamespace {
  try {
    const ctx = getRequestContext();
    return (ctx.env as CloudflareEnv).CTF_KV;
  } catch (error) {
    // Local development - use in-memory store
    if (process.env.NODE_ENV === 'development') {
      return inMemoryKV;
    }
    throw error;
  }
}

/**
 * Get environment variable from Cloudflare context or process.env.
 * Cloudflare Pages exposes env vars through request context, not process.env.
 */
export function getEnv(key: string): string {
  try {
    const ctx = getRequestContext();
    const value = (ctx.env as CloudflareEnv)[key];
    if (value !== undefined) {
      return String(value);
    }
  } catch {
    // Not in Cloudflare context, fall through to process.env
  }
  return process.env[key] || '';
}
