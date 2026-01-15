// =============================================================================
// Custom Auth Context for Edge Runtime
// =============================================================================
// Simple session management using cookies - no next-auth dependency
// =============================================================================

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface Session {
  user: User | null;
  expires: string | null;
}

interface AuthContextType {
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: "loading",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    // Fetch session on mount
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();

      if (data.user) {
        setSession({ user: data.user, expires: data.expires });
        setStatus("authenticated");
      } else {
        setSession(null);
        setStatus("unauthenticated");
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      setSession(null);
      setStatus("unauthenticated");
    }
  };

  const signOut = async () => {
    try {
      // Call signout endpoint
      await fetch("/api/auth/signout", { method: "POST" });
      setSession(null);
      setStatus("unauthenticated");
      // Redirect to login
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, status, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  const context = useContext(AuthContext);
  return {
    data: context.session,
    status: context.status,
  };
}

export function useAuth() {
  return useContext(AuthContext);
}
