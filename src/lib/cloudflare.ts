// =============================================================================
// Cloudflare Runtime Utilities
// =============================================================================
// Helpers for accessing Cloudflare bindings in Next.js Edge Runtime
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
}

/**
 * Get the KV namespace from Cloudflare request context
 * Returns the CTF_KV binding for data storage
 */
export function getKV(): KVNamespace {
  const ctx = getRequestContext();
  return (ctx.env as CloudflareEnv).CTF_KV;
}
