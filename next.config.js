/** @type {import('next').NextConfig} */

// =============================================================================
// Next.js Configuration
// =============================================================================
// This file configures how Next.js builds and runs the application.
// Key settings:
// - output: 'standalone' creates a self-contained build for Docker
// - reactStrictMode: Helps catch bugs during development
// =============================================================================

const nextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  
  // Generate a standalone build (great for Docker deployments)
  // This bundles everything needed to run without node_modules
  output: 'standalone',
  
  // Configure allowed image domains if you add external images later
  images: {
    domains: [],
  },
  
  // Environment variables that should be available client-side
  // Note: API keys should NOT be here - they stay in browser session only
  env: {
    NEXT_PUBLIC_APP_NAME: 'LLM Security CTF',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
}

module.exports = nextConfig
