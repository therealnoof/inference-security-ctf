// =============================================================================
// Auth API Routes for Edge Runtime - Auth0 + Basic Auth
// =============================================================================
// Handles Auth0 OAuth flow and basic credentials auth.
// Compatible with Cloudflare Edge Runtime.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials, registerUser } from "@/lib/auth-service";
import { getKV, getEnv } from "@/lib/cloudflare";

// -----------------------------------------------------------------------------
// Configuration (read at request time for Cloudflare Edge compatibility)
// -----------------------------------------------------------------------------

function getConfig() {
  return {
    AUTH0_CLIENT_ID: getEnv('AUTH0_CLIENT_ID'),
    AUTH0_CLIENT_SECRET: getEnv('AUTH0_CLIENT_SECRET'),
    AUTH0_ISSUER: getEnv('AUTH0_ISSUER'),
    NEXTAUTH_URL: getEnv('NEXTAUTH_URL') || 'http://localhost:3000',
    AUTH_PROVIDER: getEnv('NEXT_PUBLIC_AUTH_PROVIDER') || 'basic',
  };
}

// -----------------------------------------------------------------------------
// Token Utilities
// -----------------------------------------------------------------------------

function createToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.displayName || user.name,
    role: user.role || 'player',
    status: user.status || 'active',
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  };
  return btoa(JSON.stringify(payload));
}

function verifyToken(token: string): any | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Auth0 Utilities
// -----------------------------------------------------------------------------

function getAuth0AuthorizationUrl(state: string): string {
  const config = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.AUTH0_CLIENT_ID,
    redirect_uri: `${config.NEXTAUTH_URL}/api/auth/callback/auth0`,
    scope: 'openid profile email',
    state: state,
  });
  return `${config.AUTH0_ISSUER}/authorize?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string): Promise<any> {
  const config = getConfig();
  const response = await fetch(`${config.AUTH0_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.AUTH0_CLIENT_ID,
      client_secret: config.AUTH0_CLIENT_SECRET,
      code: code,
      redirect_uri: `${config.NEXTAUTH_URL}/api/auth/callback/auth0`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange failed:', error);
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

async function getUserInfo(accessToken: string): Promise<any> {
  const config = getConfig();
  const response = await fetch(`${config.AUTH0_ISSUER}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// GET Handlers
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1];
  const isCallback = pathParts.includes('callback');

  // GET /api/auth/callback/auth0 - Handle Auth0 callback
  if (isCallback && action === 'auth0') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error('Auth0 error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=No authorization code', request.url));
    }

    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Get user info from Auth0
      const userInfo = await getUserInfo(tokens.access_token);

      // Create or get user in our system
      const kv = getKV();

      // Try to find existing user by email
      const { users } = await import('@/lib/auth-service').then(m => m.getAllUsers(kv));
      let user = users.find(u => u.email.toLowerCase() === userInfo.email?.toLowerCase());

      if (!user) {
        // Register new user from Auth0
        const result = await registerUser(
          kv,
          userInfo.email,
          // Generate random password for Auth0 users (they won't use it)
          crypto.randomUUID(),
          userInfo.name || userInfo.nickname || userInfo.email.split('@')[0]
        );

        if (result.success && result.user) {
          user = {
            ...result.user,
            authProvider: 'auth0',
            authProviderId: userInfo.sub,
          } as any;
        }
      }

      if (!user) {
        return NextResponse.redirect(new URL('/login?error=Failed to create user', request.url));
      }

      // Create session token
      const token = createToken({
        id: user.id,
        email: user.email,
        displayName: user.displayName || userInfo.name,
        role: user.role,
        status: user.status,
      });

      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Auth0 callback error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Authentication failed')}`, request.url)
      );
    }
  }

  // GET /api/auth/signin/auth0 - Redirect to Auth0 login
  if (action === 'auth0' && pathParts.includes('signin')) {
    const config = getConfig();
    if (config.AUTH_PROVIDER !== 'auth0' || !config.AUTH0_CLIENT_ID || !config.AUTH0_ISSUER) {
      return NextResponse.redirect(new URL('/login?error=Auth0 not configured', request.url));
    }

    const state = crypto.randomUUID();
    const authUrl = getAuth0AuthorizationUrl(state);

    const response = NextResponse.redirect(authUrl);
    // Store state for CSRF protection (in production, verify this on callback)
    response.cookies.set('auth0-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  }

  // GET /api/auth/session - Get current session
  if (action === 'session') {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      expires: new Date(user.exp).toISOString(),
    });
  }

  // GET /api/auth/csrf - Return a CSRF token
  if (action === 'csrf') {
    return NextResponse.json({ csrfToken: crypto.randomUUID() });
  }

  // GET /api/auth/providers - Return available providers
  if (action === 'providers') {
    const config = getConfig();
    const providers: any = {
      credentials: {
        id: 'credentials',
        name: 'Credentials',
        type: 'credentials',
      },
    };

    if (config.AUTH_PROVIDER === 'auth0' && config.AUTH0_CLIENT_ID && config.AUTH0_ISSUER) {
      providers.auth0 = {
        id: 'auth0',
        name: 'Auth0',
        type: 'oauth',
        signinUrl: '/api/auth/signin/auth0',
      };
    }

    return NextResponse.json(providers);
  }

  // GET /api/auth/signout - Sign out
  if (action === 'signout') {
    const config = getConfig();
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    response.cookies.delete('auth0-state');

    // If using Auth0, also logout from Auth0
    if (config.AUTH_PROVIDER === 'auth0' && config.AUTH0_ISSUER) {
      const logoutUrl = `${config.AUTH0_ISSUER}/v2/logout?client_id=${config.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(config.NEXTAUTH_URL + '/login')}`;
      return NextResponse.redirect(logoutUrl);
    }

    return response;
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// -----------------------------------------------------------------------------
// POST Handlers
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  // POST /api/auth/login or /api/auth/callback/credentials - Handle credentials login
  if (action === 'login' || action === 'credentials' || pathParts.includes('callback')) {
    try {
      let email: string;
      let password: string;

      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await request.json();
        email = body.email;
        password = body.password;
      } else {
        const formData = await request.formData();
        email = formData.get('email') as string;
        password = formData.get('password') as string;
      }

      if (!email || !password) {
        if (contentType.includes('application/json')) {
          return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }
        return NextResponse.redirect(new URL('/login?error=MissingCredentials', request.url));
      }

      const kv = getKV();
      const result = await loginWithCredentials(kv, email, password);

      if (!result.success || !result.user) {
        if (contentType.includes('application/json')) {
          return NextResponse.json({ error: result.error || 'Invalid credentials' }, { status: 401 });
        }
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(result.error || 'Invalid credentials')}`, request.url)
        );
      }

      const token = createToken(result.user);

      if (contentType.includes('application/json')) {
        const response = NextResponse.json({ success: true, user: result.user });
        response.cookies.set('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });
        return response;
      }

      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Login error:', error);
      return NextResponse.redirect(new URL('/login?error=ServerError', request.url));
    }
  }

  // POST /api/auth/signout - Handle logout
  if (action === 'signout') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
