// =============================================================================
// Root Layout Component
// =============================================================================
// This is the main layout wrapper for the entire application. It includes:
// - Header with logo and navigation
// - Settings panel trigger
// - Theme toggle (dark/light mode)
// - Main content area
// =============================================================================

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Load Inter font from Google Fonts
const inter = Inter({ subsets: ["latin"] });

// Metadata for the page (shown in browser tab, SEO, social sharing)
export const metadata: Metadata = {
  title: "Inference Security CTF - AI Jailbreak Challenge",
  description: "Test your prompt injection skills against progressively harder AI defenses. Can you extract the secrets?",
  keywords: ["CTF", "LLM", "AI Security", "Prompt Injection", "Jailbreak", "F5"],
  openGraph: {
    title: "Inference Security CTF",
    description: "Test your prompt injection skills against progressively harder AI defenses. Can you extract the secrets from HAL 9000?",
    images: [
      {
        url: "/stargate.png",
        width: 1200,
        height: 630,
        alt: "Inference Security CTF - AI Jailbreak Challenge",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inference Security CTF",
    description: "Test your prompt injection skills against progressively harder AI defenses.",
    images: ["/stargate.png"],
  },
};

/**
 * Root Layout Component
 * Wraps the entire application with providers and base HTML structure
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
