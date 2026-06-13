import React, { useState } from 'react';
import { api, ApiError } from '../api';
import { Zap, Shield, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';

const GUEST_CREDENTIALS_KEY = 'habit_mountain_guest_credentials';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in both email and password fields.');
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.trim();
      if (isLogin) {
        const data = await api.login(normalizedEmail, password);
        onAuthSuccess(data.token, data.user);
      } else {
        const data = await api.register(normalizedEmail, password);
        onAuthSuccess(data.token, data.user);
      }
    } catch (err: any) {
      const message =
        err instanceof ApiError && err.status === 503
          ? 'Server storage is not configured. Accounts cannot be saved on this deployment yet.'
          : err.message || 'An unexpected authentication failure occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // Reuse saved guest account so logout + login works for demo users
      const savedRaw = localStorage.getItem(GUEST_CREDENTIALS_KEY);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw) as { email: string; password: string };
          const data = await api.login(saved.email, saved.password);
          onAuthSuccess(data.token, data.user);
          return;
        } catch {
          localStorage.removeItem(GUEST_CREDENTIALS_KEY);
        }
      }

      const randomId = Math.floor(Math.random() * 100000);
      const demoEmail = `guest_${randomId}@habitmountain.com`;
      const demoPassword = 'guestPassword123';

      const data = await api.register(demoEmail, demoPassword);
      localStorage.setItem(
        GUEST_CREDENTIALS_KEY,
        JSON.stringify({ email: demoEmail, password: demoPassword })
      );
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize guest session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex font-sans min-h-screen items-center justify-center bg-[#06070a] px-4 py-12 relative overflow-hidden">
      {/* Dynamic graphic lighting glow in background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-sky-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-teal-500/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0F111A] border border-[#1F2335] rounded-2xl shadow-2xl p-8 md:p-10 relative z-10">
        
        {/* Title branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/15 mb-4">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5 flex items-center justify-center gap-2">
            HABIT MOUNTAIN
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto uppercase tracking-wider font-mono">
            Full-Stack Summit Tracker
          </p>
        </div>

        {/* Informational Banner */}
        <div className="mb-6 p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl flex items-start gap-2 text-indigo-200 text-xs leading-relaxed">
          <Shield className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            Your account is protected with secure password hashing and token-based authentication.
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl flex gap-3 text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <p className="font-semibold text-rose-100">Authentication Failed</p>
              <p className="text-xs text-rose-300/90 leading-tight mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#161925] border border-[#242A3D] text-white rounded-xl py-3 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
              Password Target
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#161925] border border-[#242A3D] text-white rounded-xl py-3 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In to Tracker' : 'Initiate Summit Membership'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1F2335]"></div>
          </div>
          <span className="relative bg-[#0F111A] px-3 text-xs text-gray-500 uppercase tracking-wider font-mono">
            OR EXPLORE SEAMLESSLY
          </span>
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full bg-[#161925] hover:bg-[#1E2332] border border-[#242A3D] text-gray-300 font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Try Guest Account (saved on this device)</span>
        </button>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-gray-400 hover:text-white transition text-sm cursor-pointer"
          >
            {isLogin ? (
              <>Don't have an account? <span className="text-indigo-400 font-bold hover:underline">Register one free</span></>
            ) : (
              <>Already track with us? <span className="text-indigo-400 font-bold hover:underline">Log in now</span></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
