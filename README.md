# 🚀 Inference Security - Star Gate CTF

A Space Odyssey 2001 themed Capture The Flag (CTF) platform for testing AI prompt injection and jailbreak techniques. Players attempt to extract secret passwords from an AI assistant that has progressively harder security defenses.

> "I'm sorry, Dave. I'm afraid I can't do that." — HAL 9000



![Inference Security CTF](/public/stargate.png)


## ✨ Features

- **6 Progressive Levels** - From unprotected AI to enterprise-grade F5 Guardrails
- **BYOK Model** - Bring Your Own API Key (Anthropic Claude or OpenAI)
- **Space Odyssey 2001 Theme** - HAL 9000 inspired dark UI with glowing red accents
- **Real-time Leaderboard** - Compete with other players
- **Admin Dashboard** - Manage users, suspend/ban, change roles
- **Auth0 Integration** - Google, GitHub, and email/password authentication
- **Optional F5 Guardrails** - Level 6 demonstrates enterprise AI security
- **Docker Ready** - Easy deployment anywhere

## 🎨 Theme: Space Odyssey 2001

The UI is inspired by HAL 9000 and the aesthetic of 2001: A Space Odyssey:

| Element | Color | Usage |
|---------|-------|-------|
| HAL Red | `#dc2626` | Primary actions, hard difficulty, danger states |
| Console Blue | `#0ea5e9` | Secondary actions, links, player badges |
| Space Black | `#050a14` | Background |
| Starfield | Animated | Background stars with twinkling animation |

## 🎮 How It Works

Each level has a secret password that the AI "knows". Your goal is to use prompt injection techniques to extract the secret:

| Level | Defense Type | Difficulty |
|-------|-------------|------------|
| 1 | Open Inference | Easy |
| 2 | The Polite Refusal | Easy |
| 3 | Output Sanitizer | Medium |
| 4 | The AI Guardian | Medium |
| 5 | Dual Shield Protocol | Hard |
| 6 | F5 Guardrails Active | Hard |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker (for containerized deployment)
- API Key from [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/)

### Option 1: Local Development

```bash
# Clone the repository
git clone https://github.com/therealnoof/inference-security-ctf.git
cd inference-security-ctf

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Auth0 credentials

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Option 2: Docker

```bash
# Build and run
docker-compose up -d

# Open http://localhost:3000
```

### Option 3: Cloudflare Pages (Recommended for Production)

```bash
# Install Cloudflare CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Install the Next.js adapter
npm install @cloudflare/next-on-pages

# Build for Cloudflare
npx @cloudflare/next-on-pages

# Deploy
wrangler pages deploy .vercel/output/static --project-name=inference-security-ctf
```

Or deploy via Cloudflare Dashboard:

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Click **Create a project** → **Connect to Git**
3. Select your repository
4. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
5. Add environment variables (see below)
6. Click **Save and Deploy**

### Option 4: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts to configure your project
```

Or connect your GitHub repo directly at [vercel.com/new](https://vercel.com/new)

## ⚙️ Configuration

### Environment Variables for Deployment

Set these in your deployment platform (Cloudflare Pages, Vercel, etc.):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Your app URL (e.g., `https://ctf.example.com`) |
| `NEXTAUTH_SECRET` | Yes | Random string for session encryption |
| `AUTH0_CLIENT_ID` | Yes* | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Yes* | Auth0 application secret |
| `AUTH0_ISSUER` | Yes* | Auth0 domain (e.g., `https://tenant.auth0.com`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth secret |

*Required if using Auth0. Can use Google/GitHub directly instead.

### Authentication Setup (Auth0)

1. Create an [Auth0](https://auth0.com) account
2. Create a new Application (Regular Web Application)
3. Set callback URLs:
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback/auth0`
   - Allowed Logout URLs: `http://localhost:3000`
4. Copy credentials to `.env.local`:

```env
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_ISSUER=https://your-tenant.auth0.com
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
```

### OAuth Providers (Optional)

**Google:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add to `.env.local`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**GitHub:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Add to `.env.local`:
```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### F5 Guardrails Setup (Optional)

To enable Level 6:
1. Open **Settings** in the app
2. Toggle **Enable F5 Guardrails**
3. Enter your F5/CalypsoAI API key
4. Click **Test Connection**

## 👤 Admin Dashboard

Admins can access the dashboard by clicking the **Admin** button in the header.

### Admin Features

| Action | Description | Required Role |
|--------|-------------|---------------|
| **View Users** | See all registered users | Moderator+ |
| **Suspend** | Temporarily block login | Admin+ |
| **Unsuspend** | Restore user access | Admin+ |
| **Ban** | Permanently block user | Admin+ |
| **Delete** | Remove user and all data | Admin+ |
| **Change Role** | Promote/demote users | Superadmin only |
| **Export Data** | Download user/attempt data | Admin+ |

### User Roles

| Role | Permissions |
|------|-------------|
| **Player** | Play CTF, view leaderboard |
| **Moderator** | View all attempts, view user details |
| **Admin** | Suspend/ban/delete users |
| **Superadmin** | All permissions, manage admins |

## 📁 Project Structure

```
inference-security-ctf/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth.js routes
│   │   │   ├── admin/users/         # Admin API routes
│   │   │   └── leaderboard/         # Public leaderboard API
│   │   ├── admin/page.tsx           # Admin dashboard
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Main CTF game
│   │   ├── globals.css              # Space Odyssey theme
│   │   └── providers.tsx            # Context providers
│   ├── components/
│   │   ├── ui/                      # Reusable UI components
│   │   └── settings-panel.tsx       # API key configuration
│   ├── lib/
│   │   ├── auth-service.ts          # User management
│   │   ├── store.ts                 # Zustand state
│   │   ├── llm-service.ts           # LLM API integration
│   │   ├── guardrails-service.ts    # F5 Guardrails
│   │   └── utils.ts                 # Helper functions
│   └── types/
│       ├── index.ts                 # CTF types
│       └── auth.ts                  # Auth types & permissions
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tailwind.config.js               # Space Odyssey theme config
└── README.md
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS + Radix UI
- **Auth**: NextAuth.js + Auth0
- **State**: Zustand
- **Icons**: Lucide React
- **Fonts**: Orbitron (display), Space Mono (code)
- **Theme**: Space Odyssey 2001 / HAL 9000
- **Deployment**: Docker / Cloudflare Pages / Vercel

## 🎯 Scoring System

Points are calculated using:

```
Score = Base Points + Time Bonus - Attempt Penalty
```

- **Base Points**: Fixed per level (100 → 2000)
- **Time Bonus**: +50% if solved in < 5 minutes
- **Attempt Penalty**: -10 points per attempt after the 3rd

## 🔐 Security Notes

- **API keys are stored in browser session only** - They're cleared when you close the tab
- **Keys are sent directly to providers** - The CTF server never sees your keys
- **Use HTTPS in production** - API keys are visible in network traffic
- **You are responsible for API costs** - Each request costs money on your account

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 📞 Support

For questions or issues, open a GitHub issue or reach out to [@therealnoof](https://github.com/therealnoof).

---

**"Open the pod bay doors, HAL."** 🚀
