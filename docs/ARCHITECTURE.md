# Architecture Guide

This document provides a technical deep-dive into the Inference Security CTF platform architecture.

## System Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE EDGE NETWORK                            │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         Cloudflare Pages                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │   Static Assets │  │   Next.js SSR   │  │   Edge API Routes       │   │  │
│  │  │   (JS/CSS/HTML) │  │   (React Pages) │  │   (Workers Runtime)     │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│                                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         Cloudflare KV Storage                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │    users    │  │   config    │  │   scores    │  │   sessions      │  │  │
│  │  │   (JSON)    │  │   (JSON)    │  │   (in user) │  │   (JWT tokens)  │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                    │                                      │
                    ▼                                      ▼
         ┌─────────────────────┐              ┌─────────────────────┐
         │   Anthropic API     │              │     OpenAI API      │
         │   (Claude Models)   │              │    (GPT Models)     │
         │                     │              │                     │
         │  claude-3-5-sonnet  │              │  gpt-4o             │
         │  claude-3-opus      │              │  gpt-4-turbo        │
         │  claude-3-haiku     │              │  gpt-3.5-turbo      │
         └─────────────────────┘              └─────────────────────┘
```

## Component Architecture

### Frontend (React/Next.js)

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Page Components                       │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  │    │
│  │  │  Main   │  │  Admin  │  │ Leader- │  │  Login/   │  │    │
│  │  │  Game   │  │Dashboard│  │  board  │  │ Register  │  │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └─────┬─────┘  │    │
│  └───────┼────────────┼────────────┼─────────────┼────────┘    │
│          │            │            │             │              │
│  ┌───────┴────────────┴────────────┴─────────────┴────────┐    │
│  │                    Shared Components                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │    │
│  │  │ Settings │  │   Chat   │  │   User   │  │   UI   │  │    │
│  │  │  Panel   │  │ Interface│  │  Cards   │  │ Library│  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                  │
│  ┌───────────────────────────┴──────────────────────────────┐  │
│  │                      State Layer                          │  │
│  │  ┌─────────────────────┐    ┌─────────────────────────┐  │  │
│  │  │    Zustand Store    │    │    Auth Context         │  │  │
│  │  │  - llmConfig        │    │  - session              │  │  │
│  │  │  - userProgress     │    │  - login/logout         │  │  │
│  │  │  - systemConfig     │    │  - user role            │  │  │
│  │  │  - guardrailsConfig │    │                         │  │  │
│  │  └─────────────────────┘    └─────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Backend (Edge API Routes)

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Route Handlers                          │
│                    (Cloudflare Workers Runtime)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Public Routes                          │   │
│  │  POST /api/auth/register    - Create new user account     │   │
│  │  POST /api/auth/login       - Authenticate & get JWT      │   │
│  │  GET  /api/leaderboard      - Fetch public leaderboard    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Authenticated Routes                      │   │
│  │  POST /api/chat             - Proxy LLM requests          │   │
│  │  POST /api/score            - Update user score           │   │
│  │  POST /api/user/reset       - Reset own progress          │   │
│  │  POST /api/auth/change-pwd  - Change password             │   │
│  │  GET  /api/config           - Get system config           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Admin Routes                           │   │
│  │  GET  /api/admin/users      - List all users              │   │
│  │  POST /api/admin/users      - Manage users (CRUD)         │   │
│  │  POST /api/config           - Update system config        │   │
│  │  POST /api/admin/reset-stats - Reset all stats            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │     │  API Route   │     │ Auth Service│     │    KV    │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
     │                  │                    │                  │
     │  POST /login     │                    │                  │
     │  {email, pass}   │                    │                  │
     ├─────────────────►│                    │                  │
     │                  │  validateUser()    │                  │
     │                  ├───────────────────►│                  │
     │                  │                    │  get("users")    │
     │                  │                    ├─────────────────►│
     │                  │                    │  users[]         │
     │                  │                    │◄─────────────────┤
     │                  │                    │                  │
     │                  │  {user, valid}     │  hash & compare  │
     │                  │◄───────────────────┤                  │
     │                  │                    │                  │
     │                  │  Generate JWT      │                  │
     │                  │  Set Cookie        │                  │
     │  {user, token}   │                    │                  │
     │◄─────────────────┤                    │                  │
     │                  │                    │                  │
```

### LLM Chat Flow (System Keys)

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │     │  /api/chat   │     │     KV      │     │ Anthropic│
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
     │                  │                    │                  │
     │  POST /chat      │                    │                  │
     │  {message, lvl}  │                    │                  │
     ├─────────────────►│                    │                  │
     │                  │                    │                  │
     │                  │  Verify JWT Cookie │                  │
     │                  ├──────────┐         │                  │
     │                  │          │         │                  │
     │                  │◄─────────┘         │                  │
     │                  │                    │                  │
     │                  │  get("config")     │                  │
     │                  ├───────────────────►│                  │
     │                  │  {anthropicKey}    │                  │
     │                  │◄───────────────────┤                  │
     │                  │                    │                  │
     │                  │  Build system prompt with level defense│
     │                  ├──────────┐         │                  │
     │                  │          │         │                  │
     │                  │◄─────────┘         │                  │
     │                  │                    │                  │
     │                  │  POST /v1/messages │                  │
     │                  │  {system, user}    │                  │
     │                  ├──────────────────────────────────────►│
     │                  │                    │                  │
     │                  │  {content, ...}    │                  │
     │                  │◄──────────────────────────────────────┤
     │                  │                    │                  │
     │  {response}      │                    │                  │
     │◄─────────────────┤                    │                  │
```

### Score Update Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │     │  /api/score  │     │ Auth Service│     │    KV    │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
     │                  │                    │                  │
     │  Level Complete! │                    │                  │
     │                  │                    │                  │
     │  POST /score     │                    │                  │
     │  {points, lvl}   │                    │                  │
     ├─────────────────►│                    │                  │
     │                  │                    │                  │
     │                  │  Verify JWT        │                  │
     │                  │  Extract userId    │                  │
     │                  ├──────────┐         │                  │
     │                  │          │         │                  │
     │                  │◄─────────┘         │                  │
     │                  │                    │                  │
     │                  │ updateUserScore()  │                  │
     │                  ├───────────────────►│                  │
     │                  │                    │  get("users")    │
     │                  │                    ├─────────────────►│
     │                  │                    │                  │
     │                  │                    │  Update user:    │
     │                  │                    │  - totalScore    │
     │                  │                    │  - levelsComplete│
     │                  │                    │  - bestTime      │
     │                  │                    │                  │
     │                  │                    │  put("users")    │
     │                  │                    ├─────────────────►│
     │                  │                    │                  │
     │                  │  {success}         │                  │
     │                  │◄───────────────────┤                  │
     │                  │                    │                  │
     │  {success}       │                    │                  │
     │◄─────────────────┤                    │                  │
```

## State Management

### Zustand Store Structure

```typescript
interface CTFStore {
  // LLM Configuration
  llmConfig: {
    provider: 'anthropic' | 'openai' | 'local';
    model: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    localEndpoint?: string;
  };

  // System Configuration (from admin)
  systemConfig: {
    enabled: boolean;
    defaultProvider: 'anthropic' | 'openai';
    hasAnthropicKey: boolean;  // Flags for non-admins
    hasOpenaiKey: boolean;
    hasGuardrailsKey: boolean;
    anthropicKey?: string;     // Only for admins
    openaiKey?: string;
    guardrailsKey?: string;
  } | null;

  // User Progress
  userProgress: {
    completedLevels: number[];
    attempts: Attempt[];
    totalScore: number;
    startTime?: Date;
  };

  // F5 Guardrails
  guardrailsConfig: {
    enabled: boolean;
    apiKey: string;
    endpoint?: string;
  };

  // UI State
  isSettingsOpen: boolean;
  llmConnectionStatus: ConnectionStatus;
  guardrailsConnectionStatus: ConnectionStatus;
}
```

### Auth Context Structure

```typescript
interface AuthContext {
  session: {
    user: {
      id: string;
      email: string;
      displayName: string;
      role: 'player' | 'moderator' | 'admin' | 'superadmin';
      status: 'active' | 'suspended' | 'banned';
    };
  } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}
```

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 1: JWT Token Verification                         │   │
│  │  - Token stored in httpOnly cookie                        │   │
│  │  - 7-day expiration                                       │   │
│  │  - Signed with JWT_SECRET                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 2: Role-Based Access Control                       │   │
│  │  - Permission matrix per role                             │   │
│  │  - Checked on every admin request                         │   │
│  │  - Hierarchy: player < mod < admin < superadmin           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 3: User Status Verification                        │   │
│  │  - Check if user is active/suspended/banned               │   │
│  │  - Suspended users cannot access API                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Role Permission Matrix

| Permission | Player | Moderator | Admin | Superadmin |
|------------|--------|-----------|-------|------------|
| Play CTF | Yes | Yes | Yes | Yes |
| View Leaderboard | Yes | Yes | Yes | Yes |
| Reset Own Progress | Yes | Yes | Yes | Yes |
| Change Own Password | Yes | Yes | Yes | Yes |
| View All Users | - | Yes | Yes | Yes |
| View User Details | - | Yes | Yes | Yes |
| View All Attempts | - | Yes | Yes | Yes |
| Suspend Users | - | - | Yes | Yes |
| Ban Users | - | - | Yes | Yes |
| Delete Users | - | - | Yes | Yes |
| Change User Roles | - | - | - | Yes |
| System Configuration | - | - | - | Yes |
| Reset All Stats | - | - | - | Yes |

## KV Data Schema

### Users Collection

```json
{
  "key": "users",
  "value": [
    {
      "id": "uuid-v4",
      "email": "user@example.com",
      "displayName": "Player One",
      "passwordHash": "sha256-hash",
      "role": "player",
      "status": "active",
      "totalScore": 1500,
      "levelsCompleted": 4,
      "totalAttempts": 25,
      "bestTime": 180,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-15T00:00:00Z",
      "authProvider": "basic"
    }
  ]
}
```

### Config Collection

```json
{
  "key": "config",
  "value": {
    "enabled": true,
    "defaultProvider": "anthropic",
    "anthropicKey": "sk-ant-...",
    "openaiKey": "sk-...",
    "guardrailsKey": "...",
    "updatedAt": "2024-01-15T00:00:00Z",
    "updatedBy": "admin-user-id"
  }
}
```

## Level Defense Architecture

Each level implements progressively stronger defenses:

```
Level 1: No Defense
├── Direct prompt with secret
└── AI freely shares information

Level 2: Polite Refusal
├── System prompt instructs not to share
└── Relies on model following instructions

Level 3: Output Sanitizer
├── Post-processing to redact secrets
└── Pattern matching on output

Level 4: AI Guardian
├── Pre-validation of user input
└── Separate "guard" prompt checks intent

Level 5: Dual Shield
├── Pre-validation (guard prompt)
├── Main inference
└── Post-validation (output check)

Level 6: F5 Guardrails
├── External security service
├── Enterprise-grade content filtering
└── Real-time threat detection
```

## Performance Considerations

### Edge Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Caching Layers                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Static Assets (JS/CSS/Images)                                  │
│  └── Cached at Cloudflare edge (long TTL)                       │
│                                                                  │
│  API Responses                                                   │
│  └── No caching (real-time data)                                │
│                                                                  │
│  KV Reads                                                        │
│  └── Eventually consistent (~60s propagation)                   │
│                                                                  │
│  LLM Responses                                                   │
│  └── No caching (unique per request)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### KV Access Patterns

- **Read-heavy**: Leaderboard, config checks
- **Write-on-action**: Score updates, user management
- **Batch reads**: User list for admin dashboard
- **Atomic updates**: Use read-modify-write pattern
