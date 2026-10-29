'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  onSuccess: (user: User) => void;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'guest';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>(initialMode);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === 'guest') {
        const user = authService.getOrCreateGuestUser(displayName || 'Guest Attendee');
        onSuccess(user);
      } else if (mode === 'login') {
        const res = await authService.login(email, password);
        onSuccess(res.user);
      } else {
        const res = await authService.register(email, displayName, password);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141f] p-6 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> SnapRoom Identity
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login'
              ? 'Sign in to SnapRoom'
              : mode === 'register'
              ? 'Create Host Account'
              : 'Guest Fast Pass'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'guest'
              ? 'Enter your name to preview or join event rooms with your camera.'
              : 'Access your created rooms and facial galleries.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => setMode('guest')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'guest' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Guest Pass
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {(mode === 'register' || mode === 'guest') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required={mode === 'register'}
                  placeholder={mode === 'guest' ? 'e.g., Alex Johnson (optional)' : 'e.g., Alex Johnson'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          {mode !== 'guest' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          {mode !== 'guest' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>
              {mode === 'login'
                ? 'Sign In & Continue'
                : mode === 'register'
                ? 'Create Account'
                : 'Continue as Guest'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400">
            {mode === 'login' ? (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-indigo-400 hover:underline"
                >
                  Register as host
                </button>
              </>
            ) : mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-indigo-400 hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Want a permanent host account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-indigo-400 hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
