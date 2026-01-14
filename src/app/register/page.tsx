// =============================================================================
// Register Page - Inference Security CTF
// =============================================================================
// Space Odyssey 2001 themed registration page.
// Creates new user accounts with email/password.
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, User, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';

// Import shared components (HAL Eye and Starfield)
// In production, these would be in a shared components folder

const Starfield = () => {
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

const HalEye = ({ size = 48 }: { size?: number }) => (
  <div 
    className="relative rounded-full hal-eye"
    style={{
      width: size,
      height: size,
      background: 'radial-gradient(circle at 30% 30%, #ef4444, #dc2626 50%, #991b1b 100%)',
    }}
  >
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
          box-shadow: 0 0 15px rgba(220,38,38,0.4), 0 0 30px rgba(220,38,38,0.2);
        } 
        50% { 
          box-shadow: 0 0 25px rgba(220,38,38,0.8), 0 0 50px rgba(220,38,38,0.5);
        } 
      }
      @keyframes hal-scale {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
    `}</style>
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
      } else {
        // Redirect to login on success
        router.push('/login?registered=true');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <HalEye size={48} />
            <h1 className="text-3xl font-bold text-white tracking-wide">
              Inference Security CTF
            </h1>
          </div>
          <p className="text-gray-500 mt-2">Create your operator account</p>
        </div>
        
        {/* Register Card */}
        <div 
          className="rounded-xl p-6 border"
          style={{ background: colors.spaceDark, borderColor: colors.spaceMedium }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            Request Access
          </h2>

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
          
          <form onSubmit={handleRegister} className="space-y-4 mb-6">
            {/* Display Name */}
            <div>
              <label className="text-sm text-gray-300 block mb-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="h4ck3r_name" 
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: colors.spaceMedium, border: `1px solid ${colors.spaceMedium}` }}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-gray-300 block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@mission.control" 
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: colors.spaceMedium, border: `1px solid ${colors.spaceMedium}` }}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-gray-300 block mb-1">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full h-10 pl-10 pr-10 rounded-lg text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: colors.spaceMedium, border: `1px solid ${colors.spaceMedium}` }}
                  disabled={isLoading}
                  required
                  minLength={8}
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
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-10 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: colors.halRed, boxShadow: `0 0 15px rgba(220,38,38,0.5)` }}
            >
              <UserPlus className="h-4 w-4" />
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          {/* Login Link */}
          <p className="text-center text-sm text-gray-500">
            Already have access?{' '}
            <a href="/login" className="hover:underline" style={{ color: colors.consoleBlue }}>
              Sign in
            </a>
          </p>
        </div>
        
        <p className="text-center text-xs text-gray-600 mt-6 italic">
          "Good afternoon, gentlemen. I am a HAL 9000 computer."
        </p>
      </div>
    </div>
  );
}
