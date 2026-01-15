// =============================================================================
// Providers Component
// =============================================================================
// This component wraps the application with all necessary React context providers.
// Includes:
// - Custom AuthProvider for authentication (Edge Runtime compatible)
// - Theme provider for dark/light mode
// =============================================================================

"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { useCTFStore } from "@/lib/store";

// Fetch system config on app load
function SystemConfigLoader() {
  const fetchSystemConfig = useCTFStore((state) => state.fetchSystemConfig);

  useEffect(() => {
    fetchSystemConfig();
  }, [fetchSystemConfig]);

  return null;
}

/**
 * Providers Component
 * Wraps children with necessary context providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Track if we've mounted (for hydration safety)
  const [mounted, setMounted] = useState(false);

  // Get dark mode state from store
  const isDarkMode = useCTFStore((state) => state.isDarkMode);

  // After mount, we can safely access browser APIs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle("dark", isDarkMode);
    }
  }, [isDarkMode, mounted]);

  // Prevent hydration mismatch by not rendering until mounted
  // This avoids flash of wrong theme
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton loader while mounting */}
        <div className="animate-pulse">
          <div className="h-16 bg-muted" />
          <div className="container mx-auto p-8">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <SystemConfigLoader />
      {children}
    </AuthProvider>
  );
}
