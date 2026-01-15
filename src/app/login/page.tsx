// =============================================================================
// Login Page - Inference Security CTF
// =============================================================================
// Space Odyssey 2001 themed login page with HAL 9000 eye and starfield.
// Supports Auth0, Google, GitHub OAuth and email/password authentication.
// =============================================================================

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, Eye, EyeOff, LogIn, Github, AlertCircle } from 'lucide-react';

// -----------------------------------------------------------------------------
// Starfield Background Component
// -----------------------------------------------------------------------------

const Starfield = () => {
  // Generate random stars on mount
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 3,
  }));

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ 
        background: 'radial-gradient(ellipse at bottom, #0c1525 0%, #050a14 100%)',
        zIndex: -1 
      }}
    >
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
            opacity: 0.6,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// -----------------------------------------------------------------------------
// HAL 9000 Eye Component with Pulsating Animation
// -----------------------------------------------------------------------------

const HalEye = ({ size = 48 }: { size?: number }) => (
  <div 
    className="relative rounded-full hal-eye"
    style={{
      width: size,
      height: size,
      background: 'radial-gradient(circle at 30% 30%, #ef4444, #dc2626 50%, #991b1b 100%)',
    }}
  >
    {/* Highlight reflection */}
    <div 
      className="absolute rounded-full"
      style={{ 
        top: '25%', 
        left: '25%', 
        width: '25%', 
        height: '25%', 
        background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)' 
      }} 
    />
    <style jsx>{`
      .hal-eye {
        animation: hal-pulse 2s ease-in-out infinite, hal-scale 2s ease-in-out infinite;
      }
      @keyframes hal-pulse { 
        0%, 100% { 
          box-shadow: 0 0 15px rgba(220,38,38,0.4), 0 0 30px rgba(220,38,38,0.2), 0 0 45px rgba(220,38,38,0.1);
        } 
        50% { 
          box-shadow: 0 0 25px rgba(220,38,38,0.8), 0 0 50px rgba(220,38,38,0.5), 0 0 75px rgba(220,38,38,0.3);
        } 
      }
      @keyframes hal-scale {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
    `}</style>
  </div>
);

// -----------------------------------------------------------------------------
// Login Page Component
// -----------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle email/password login via form submission
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Submit form directly to auth endpoint
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  // OAuth not supported in simple auth mode
  const handleOAuthLogin = (provider: string) => {
    setError('OAuth login is not available. Please use email/password.');
  };

  // Theme colors
  const colors = {
    halRed: '#dc2626',
    consoleBlue: '#0ea5e9',
    spaceBlack: '#050a14',
    spaceDark: '#0c1525',
    spaceMedium: '#1a2744',
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: colors.spaceBlack }}
    >
      <Starfield />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo with HAL Eye */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <HalEye size={48} />
            <h1 
              className="text-3xl font-bold text-white tracking-wide"
              style={{ fontFamily: 'system-ui' }}
            >
              Inference Security CTF
            </h1>
          </div>
          <p className="text-gray-500 mt-2">
            Test your prompt injection skills against AI defenses
          </p>
        </div>
        
        {/* Login Card */}
        <div 
          className="rounded-xl p-6 border"
          style={{ 
            background: colors.spaceDark, 
            borderColor: colors.spaceMedium 
          }}
        >
          <h2 
            className="text-xl font-semibold text-white mb-6"
            style={{ fontFamily: 'system-ui' }}
          >
            System Access
          </h2>

          {/* Error Message */}
          {error && (
            <div 
              className="flex items-center gap-2 p-3 mb-4 rounded-lg text-sm"
              style={{ 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#f87171'
              }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {/* Login Form */}
          <form
            ref={formRef}
            action="/api/auth/login"
            method="POST"
            onSubmit={handleCredentialsLogin}
            className="space-y-4 mb-6"
          >
            {/* Email Field */}
            <div>
              <label className="text-sm text-gray-300 block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@mission.control"
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-gray-200 placeholder-gray-600 outline-none transition-colors focus:ring-1"
                  style={{
                    background: colors.spaceMedium,
                    border: `1px solid ${colors.spaceMedium}`,
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-sm text-gray-300 block mb-1">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-lg text-gray-200 placeholder-gray-600 outline-none transition-colors"
                  style={{
                    background: colors.spaceMedium,
                    border: `1px solid ${colors.spaceMedium}`
                  }}
                  disabled={isLoading}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-700"
                >
                  {showPassword 
                    ? <EyeOff className="h-4 w-4 text-gray-500" /> 
                    : <Eye className="h-4 w-4 text-gray-500" />
                  }
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-10 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ 
                background: colors.halRed, 
                boxShadow: `0 0 15px rgba(220,38,38,0.5)` 
              }}
            >
              <LogIn className="h-4 w-4" />
              {isLoading ? 'Initializing...' : 'Initialize Session'}
            </button>
          </form>
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div 
                className="w-full border-t"
                style={{ borderColor: colors.spaceMedium }}
              />
            </div>
            <div className="relative flex justify-center text-sm">
              <span 
                className="px-2 text-gray-500"
                style={{ background: colors.spaceDark }}
              >
                or authenticate via
              </span>
            </div>
          </div>
          
          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="h-10 rounded-lg flex items-center justify-center gap-2 text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              style={{ border: `1px solid ${colors.spaceMedium}` }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path 
                  fill="currentColor" 
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path 
                  fill="currentColor" 
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path 
                  fill="currentColor" 
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path 
                  fill="currentColor" 
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button 
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={isLoading}
              className="h-10 rounded-lg flex items-center justify-center gap-2 text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              style={{ border: `1px solid ${colors.spaceMedium}` }}
            >
              <Github className="h-5 w-5" />
              GitHub
            </button>
          </div>
          
          {/* Register Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            New operator?{' '}
            <a 
              href="/register" 
              className="hover:underline"
              style={{ color: colors.consoleBlue }}
            >
              Request access
            </a>
          </p>
        </div>
        
        {/* HAL Quote */}
        <p className="text-center text-xs text-gray-600 mt-6 italic">
          "I'm sorry, Dave. I'm afraid I can't do that."
        </p>
      </div>
    </div>
  );
}
