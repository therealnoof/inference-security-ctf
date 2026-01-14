// =============================================================================
// NextAuth.js Configuration with Auth0
// =============================================================================
// This file configures authentication using NextAuth.js with Auth0 as the
// primary provider. It also supports credentials (email/password) for
// development/testing.
//
// Setup instructions:
// 1. Create an Auth0 account at https://auth0.com
// 2. Create a new Application (Regular Web Application)
// 3. Set callback URL to: http://localhost:3000/api/auth/callback/auth0
// 4. Copy your credentials to .env.local
// =============================================================================

import NextAuth, { NextAuthOptions } from "next-auth";
import Auth0Provider from "next-auth/providers/auth0";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginWithCredentials } from "@/lib/auth-service";

// -----------------------------------------------------------------------------
// NextAuth Configuration
// -----------------------------------------------------------------------------

export const authOptions: NextAuthOptions = {
  // Configure authentication providers
  providers: [
    // ----- Auth0 Provider (Recommended for production) -----
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER, // e.g., https://your-tenant.auth0.com
    }),

    // ----- Google OAuth (via Auth0 or direct) -----
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ----- GitHub OAuth -----
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),

    // ----- Email/Password (for development or simple deployments) -----
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Use the shared auth service for login
        const result = await loginWithCredentials(
          credentials.email,
          credentials.password
        );

        if (!result.success || !result.user) {
          throw new Error(result.error || "Invalid email or password");
        }

        // Return user object for NextAuth
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.displayName,
          role: result.user.role,
          status: result.user.status,
        };
      },
    }),
  ],

  // ----- Session Configuration -----
  session: {
    strategy: "jwt", // Use JWT for stateless sessions
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  // ----- JWT Configuration -----
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  // ----- Custom Pages -----
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login", // Error page
    newUser: "/", // Redirect new users to home
  },

  // ----- Callbacks -----
  callbacks: {
    // Add custom data to JWT token
    async jwt({ token, user, account }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'player';
        token.status = (user as any).status || 'active';
      }

      // For OAuth providers, look up or create user in database
      if (account && account.provider !== 'credentials') {
        // In production: look up user by email or create new user
        token.role = 'player'; // Default role for new OAuth users
        token.status = 'active';
      }

      return token;
    },

    // Add token data to session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
      }
      return session;
    },

    // Control who can sign in
    async signIn({ user, account, profile }) {
      // Allow all sign-ins by default
      // In production: check if user is banned, verify email domain, etc.
      return true;
    },
  },

  // ----- Events -----
  events: {
    // Log sign-in events
    async signIn({ user, account }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
      // In production: update lastLoginAt in database
    },

    // Log sign-out events
    async signOut({ token }) {
      console.log(`User signed out: ${token.email}`);
    },
  },

  // ----- Debug Mode -----
  debug: process.env.NODE_ENV === 'development',
};

// Export the handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
