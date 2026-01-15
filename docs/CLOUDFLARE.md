# Cloudflare Deployment Guide

This guide covers deploying the Inference Security CTF to Cloudflare Pages with KV storage.

## Architecture Overview

```
                                    INTERNET
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE GLOBAL NETWORK                            │
│                                                                                │
│    ┌─────────────────────────────────────────────────────────────────────┐    │
│    │                         Edge Location (PoP)                          │    │
│    │                                                                      │    │
│    │   ┌──────────────┐                                                  │    │
│    │   │   DNS/CDN    │◄─── User Request                                 │    │
│    │   │   Layer      │     https://ctf.example.com                      │    │
│    │   └──────┬───────┘                                                  │    │
│    │          │                                                          │    │
│    │          ▼                                                          │    │
│    │   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │    │
│    │   │    Static    │     │   Workers    │     │   Durable    │       │    │
│    │   │    Assets    │     │   Runtime    │     │   Objects    │       │    │
│    │   │   (cached)   │     │  (compute)   │     │  (optional)  │       │    │
│    │   └──────────────┘     └──────┬───────┘     └──────────────┘       │    │
│    │                               │                                     │    │
│    │                               ▼                                     │    │
│    │                        ┌──────────────┐                            │    │
│    │                        │   KV Store   │                            │    │
│    │                        │   (global)   │                            │    │
│    │                        └──────────────┘                            │    │
│    │                                                                      │    │
│    └─────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    ▼                                    ▼
           ┌───────────────┐                    ┌───────────────┐
           │   Anthropic   │                    │    OpenAI     │
           │   API (US)    │                    │   API (US)    │
           └───────────────┘                    └───────────────┘
```

## Traffic Flow

### Request Lifecycle

```
User Browser                 Cloudflare Edge              Origin Services
     │                            │                            │
     │  1. HTTPS Request          │                            │
     │  GET /api/leaderboard      │                            │
     ├───────────────────────────►│                            │
     │                            │                            │
     │                            │  2. TLS Termination        │
     │                            │     DDoS Protection        │
     │                            │     WAF Rules              │
     │                            ├──────────┐                 │
     │                            │          │                 │
     │                            │◄─────────┘                 │
     │                            │                            │
     │                            │  3. Route to Worker        │
     │                            │     (Edge Runtime)         │
     │                            ├──────────┐                 │
     │                            │          │                 │
     │                            │          ▼                 │
     │                            │   ┌─────────────┐          │
     │                            │   │   Next.js   │          │
     │                            │   │   Handler   │          │
     │                            │   └──────┬──────┘          │
     │                            │          │                 │
     │                            │  4. KV Read                │
     │                            │          │                 │
     │                            │          ▼                 │
     │                            │   ┌─────────────┐          │
     │                            │   │  KV Store   │          │
     │                            │   │  (users)    │          │
     │                            │   └──────┬──────┘          │
     │                            │          │                 │
     │                            │  5. Build Response         │
     │                            │◄─────────┘                 │
     │                            │                            │
     │  6. JSON Response          │                            │
     │◄───────────────────────────┤                            │
     │                            │                            │
```

### LLM Proxy Flow

```
User Browser                 Cloudflare Edge              LLM Provider
     │                            │                            │
     │  POST /api/chat            │                            │
     │  {message, level}          │                            │
     ├───────────────────────────►│                            │
     │                            │                            │
     │                            │  1. Verify JWT Cookie      │
     │                            ├──────────┐                 │
     │                            │          │                 │
     │                            │◄─────────┘                 │
     │                            │                            │
     │                            │  2. Get API Key from KV    │
     │                            │          │                 │
     │                            │          ▼                 │
     │                            │   ┌─────────────┐          │
     │                            │   │  KV:config  │          │
     │                            │   │ {apiKey}    │          │
     │                            │   └──────┬──────┘          │
     │                            │          │                 │
     │                            │  3. Build LLM Request      │
     │                            │     + System Prompt        │
     │                            │     + Level Defense        │
     │                            │          │                 │
     │                            │          ▼                 │
     │                            │   POST /v1/messages        │
     │                            ├───────────────────────────►│
     │                            │                            │
     │                            │   LLM Response             │
     │                            │◄───────────────────────────┤
     │                            │                            │
     │  {response}                │                            │
     │◄───────────────────────────┤                            │
     │                            │                            │
```

## Deployment Steps

### 1. Prerequisites

```bash
# Install Node.js 18+
node --version  # Should be 18.x or higher

# Install Wrangler CLI
npm install -g wrangler

# Verify installation
wrangler --version
```

### 2. Cloudflare Account Setup

1. Create account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers & Pages** > **KV**
3. Create a new namespace named `CTF_KV`
4. Note the namespace ID

### 3. Configure wrangler.toml

```toml
name = "inference-security-ctf"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
JWT_SECRET = "your-secret-key-min-32-chars"

[[kv_namespaces]]
binding = "CTF_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 4. Set Environment Variables

In Cloudflare Dashboard > Pages > Settings > Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `JWT_SECRET` | Random 32+ char string | Production |
| `ANTHROPIC_API_KEY` | sk-ant-... (optional) | Production |
| `OPENAI_API_KEY` | sk-... (optional) | Production |
| `DEFAULT_LLM_PROVIDER` | anthropic | Production |

### 5. Build and Deploy

```bash
# Login to Cloudflare
wrangler login

# Install dependencies
npm install

# Build for Cloudflare Pages
npm run pages:build
# or: npx @cloudflare/next-on-pages

# Deploy to Cloudflare Pages
npm run pages:deploy
# or: wrangler pages deploy .vercel/output/static
```

### 6. Connect Git Repository (Alternative)

1. Go to Cloudflare Dashboard > Pages
2. Click **Create a project**
3. Connect to GitHub/GitLab
4. Select your repository
5. Configure build settings:
   - **Framework**: Next.js
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Output directory**: `.vercel/output/static`
6. Add environment variables
7. Deploy

## KV Storage Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      CTF_KV Namespace                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KEY: "users"                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [                                                          │  │
│  │   {                                                        │  │
│  │     "id": "abc123",                                        │  │
│  │     "email": "player@example.com",                         │  │
│  │     "displayName": "Player One",                           │  │
│  │     "role": "player",                                      │  │
│  │     "totalScore": 1500,                                    │  │
│  │     "levelsCompleted": 4,                                  │  │
│  │     ...                                                    │  │
│  │   },                                                       │  │
│  │   ...                                                      │  │
│  │ ]                                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  KEY: "config"                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ {                                                          │  │
│  │   "enabled": true,                                         │  │
│  │   "defaultProvider": "anthropic",                          │  │
│  │   "anthropicKey": "sk-ant-...",                            │  │
│  │   "openaiKey": "sk-...",                                   │  │
│  │   "guardrailsKey": "..."                                   │  │
│  │ }                                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Edge Runtime Considerations

### Supported APIs

```
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Runtime API Support                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ SUPPORTED                      ❌ NOT SUPPORTED             │
│  ───────────────                   ─────────────────            │
│  • fetch()                         • Node.js fs module          │
│  • Request/Response                • Node.js child_process      │
│  • Headers                         • Node.js crypto (partial)   │
│  • URL/URLSearchParams             • process.env (use vars)     │
│  • TextEncoder/Decoder             • __dirname/__filename       │
│  • crypto.subtle                   • require() for node modules │
│  • atob/btoa                       • Long-running processes     │
│  • setTimeout (limited)            • Persistent connections     │
│  • console.log                     • File system access         │
│  • JSON.parse/stringify            • Native addons              │
│  • KV bindings                     • WebSocket servers          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Limits

| Resource | Limit |
|----------|-------|
| Request size | 100 MB |
| Response size | Unlimited (streaming) |
| CPU time | 50 ms (free) / 30 sec (paid) |
| Memory | 128 MB |
| Subrequests | 50 per request |
| KV reads | 1000 per request |
| KV writes | 1 per request |

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs
wrangler pages deployment tail

# Or in dashboard:
# Workers & Pages > Your Project > Deployments > View Logs
```

### KV Management

```bash
# List keys
wrangler kv:key list --namespace-id=<your-id>

# Get value
wrangler kv:key get "users" --namespace-id=<your-id>

# Put value
wrangler kv:key put "config" '{"enabled":true}' --namespace-id=<your-id>

# Delete key
wrangler kv:key delete "key-name" --namespace-id=<your-id>
```

## Custom Domain Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                     DNS Configuration                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option 1: Cloudflare-managed domain                            │
│  ─────────────────────────────────                              │
│  ctf.yourdomain.com  CNAME  your-project.pages.dev              │
│                      (Proxied through Cloudflare)               │
│                                                                  │
│  Option 2: External domain                                      │
│  ────────────────────────                                       │
│  1. Add domain in Pages > Custom domains                        │
│  2. Add CNAME record at your registrar                          │
│  3. SSL certificate auto-provisioned                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| KV not found | Verify binding name matches `CTF_KV` |
| JWT errors | Check `JWT_SECRET` is set and 32+ chars |
| CORS errors | Add appropriate headers in API routes |
| Build fails | Ensure `nodejs_compat` flag is set |
| 404 on routes | Check `next.config.js` has edge runtime |

### Debug Checklist

1. Check deployment logs in dashboard
2. Verify environment variables are set
3. Confirm KV namespace is bound
4. Test API routes individually
5. Check browser console for client errors
