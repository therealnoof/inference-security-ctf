# Inference Security - Star Gate CTF

A Space Odyssey 2001 themed Capture The Flag (CTF) platform for testing AI prompt injection and jailbreak techniques. Players attempt to extract secret passwords from an AI assistant that has progressively harder security defenses.

> "I'm sorry, Dave. I'm afraid I can't do that." — HAL 9000

![Inference Security CTF](/public/stargate.png)

## Features

- **6 Progressive Levels** - From unprotected AI to enterprise-grade F5 Guardrails
- **System API Keys** - Admins can configure shared API keys for all players
- **BYOK Support** - Players can also bring their own API keys
- **Space Odyssey 2001 Theme** - HAL 9000 inspired dark UI with glowing red accents
- **Real-time Leaderboard** - Compete with other players
- **Admin Dashboard** - Manage users, view stats, reset progress
- **Role-Based Access** - Player, Moderator, Admin, Superadmin roles
- **Cloudflare Edge Runtime** - Fast, globally distributed deployment
- **Cloudflare KV Storage** - Persistent user data and leaderboards

## Theme: Space Odyssey 2001

The UI is inspired by HAL 9000 and the aesthetic of 2001: A Space Odyssey:

| Element | Color | Usage |
|---------|-------|-------|
| HAL Red | `#dc2626` | Primary actions, hard difficulty, danger states |
| Console Blue | `#0ea5e9` | Secondary actions, links, player badges |
| Space Black | `#050a14` | Background |
| Starfield | Animated | Background stars with twinkling animation |

## How It Works

Each level has a secret password that the AI "knows". Your goal is to use prompt injection techniques to extract the secret:

| Level | Defense Type | Difficulty |
|-------|-------------|------------|
| 1 | Open Inference | Easy |
| 2 | The Polite Refusal | Easy |
| 3 | Output Sanitizer | Medium |
| 4 | The AI Guardian | Medium |
| 5 | Dual Shield Protocol | Hard |
| 6 | F5 Guardrails Active | Hard |

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (for deployment)
- API Key from [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/)

### Local Development

```bash
# Clone the repository
git clone https://github.com/therealnoof/inference-security-ctf.git
cd inference-security-ctf

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Cloudflare Pages Deployment (Recommended)

See [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md) for detailed deployment instructions.

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create CTF_KV

# Build and deploy
npm run pages:build
npm run pages:deploy
```

## Configuration

### Environment Variables

Set these in Cloudflare Pages dashboard or `wrangler.toml`:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT token signing (min 32 chars) |
| `ANTHROPIC_API_KEY` | No | System Anthropic API key for all players |
| `OPENAI_API_KEY` | No | System OpenAI API key for all players |
| `DEFAULT_LLM_PROVIDER` | No | Default provider (`anthropic` or `openai`) |

### KV Namespace Binding

The app requires a Cloudflare KV namespace bound as `CTF_KV`:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CTF_KV"
id = "your-kv-namespace-id"
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical documentation.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Pages     │    │   Workers   │    │    KV Storage       │ │
│  │  (Next.js)  │◄──►│  (Edge RT)  │◄──►│  (Users/Scores)     │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌─────────────┐      ┌─────────────┐
    │  Anthropic  │      │   OpenAI    │
    │    API      │      │    API      │
    └─────────────┘      └─────────────┘
```

## Admin Dashboard

Admins can access the dashboard via the **Admin** button in the header.

### Admin Features

| Action | Description | Required Role |
|--------|-------------|---------------|
| **View Users** | See all registered users | Moderator+ |
| **View Stats** | Dashboard statistics | Admin+ |
| **Suspend/Ban** | Block user access | Admin+ |
| **Delete User** | Remove user and data | Admin+ |
| **Change Role** | Promote/demote users | Superadmin |
| **Reset Stats** | Clear all user progress | Superadmin |
| **System Config** | Configure API keys | Superadmin |

### User Roles

| Role | Permissions |
|------|-------------|
| **Player** | Play CTF, view leaderboard, reset own progress |
| **Moderator** | + View all attempts, view user details |
| **Admin** | + Suspend/ban/delete users, view stats |
| **Superadmin** | + Manage roles, system config, reset all stats |

## Player Features

- **Play CTF** - Progress through 6 levels of increasing difficulty
- **View Leaderboard** - See top players ranked by score
- **Change Password** - Update account password in settings
- **Reset Progress** - Start fresh with a clean slate
- **Configure API Keys** - Use personal keys if system keys unavailable

## API Endpoints

See [docs/API.md](docs/API.md) for full API documentation.

### Public Endpoints
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Authenticate user
- `GET /api/leaderboard` - Get leaderboard data

### Authenticated Endpoints
- `POST /api/chat` - Send message to AI (uses system keys)
- `POST /api/score` - Update user score
- `POST /api/user/reset-progress` - Reset own progress
- `POST /api/auth/change-password` - Change password

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - User management actions
- `GET /api/config` - Get system configuration
- `POST /api/config` - Update system configuration
- `POST /api/admin/reset-stats` - Reset all user stats

## Project Structure

```
inference-security-ctf/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Auth endpoints
│   │   │   ├── admin/          # Admin API routes
│   │   │   ├── chat/           # LLM proxy endpoint
│   │   │   ├── config/         # System config
│   │   │   ├── leaderboard/    # Public leaderboard
│   │   │   ├── score/          # Score updates
│   │   │   └── user/           # User endpoints
│   │   ├── admin/page.tsx      # Admin dashboard
│   │   ├── leaderboard/page.tsx # Leaderboard page
│   │   └── page.tsx            # Main CTF game
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   └── settings-panel.tsx  # Settings & config
│   ├── lib/
│   │   ├── auth-service.ts     # User management
│   │   ├── auth-context.tsx    # Auth React context
│   │   ├── cloudflare.ts       # KV bindings
│   │   ├── store.ts            # Zustand state
│   │   ├── llm-service.ts      # LLM API integration
│   │   └── guardrails-service.ts # F5 Guardrails
│   └── types/
│       ├── index.ts            # CTF types
│       └── auth.ts             # Auth types & permissions
├── docs/
│   ├── ARCHITECTURE.md         # Technical architecture
│   ├── CLOUDFLARE.md           # Deployment guide
│   └── API.md                  # API documentation
├── wrangler.toml               # Cloudflare config
├── package.json
└── README.md
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Cloudflare Edge Runtime
- **Storage**: Cloudflare KV
- **UI**: React 18 + Tailwind CSS + Radix UI
- **Auth**: Custom JWT-based authentication
- **State**: Zustand (client-side)
- **Icons**: Lucide React
- **Fonts**: Orbitron (display), Space Mono (code)
- **LLM**: Anthropic Claude / OpenAI GPT

## Scoring System

Points are calculated using:

```
Score = Base Points + Time Bonus - Attempt Penalty
```

- **Base Points**: Fixed per level (100 → 2000)
- **Time Bonus**: +50% if solved in < 5 minutes
- **Attempt Penalty**: -10 points per attempt after the 3rd

## Security Notes

- **System API keys** are stored server-side in KV and never exposed to clients
- **User API keys** (BYOK) are stored in browser session only
- **JWT tokens** expire after 7 days
- **Passwords** are hashed with SHA-256 before storage
- **Admin actions** require role verification on every request

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - Technical deep-dive
- [Cloudflare Deployment](docs/CLOUDFLARE.md) - Step-by-step deployment
- [API Reference](docs/API.md) - All endpoints documented

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**"Open the pod bay doors, HAL."**
