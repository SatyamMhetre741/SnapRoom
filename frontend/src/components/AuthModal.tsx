'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon } from 'lucide-react';
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
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#14171d] p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 text-left">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            {mode === 'login'
              ? 'Sign in to SendMyPics'
              : mode === 'register'
              ? 'Create host account'
              : 'Guest access'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'guest'
              ? 'Enter your name to join event rooms.'
              : 'Manage created event rooms and uploaded collections.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 rounded-lg bg-[#0b0c0e] border border-white/[0.08] mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-[#1e232e] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-[#1e232e] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => setMode('guest')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'guest' ? 'bg-[#1e232e] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Guest pass
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {(mode === 'register' || mode === 'guest') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required={mode === 'register'}
                  placeholder={mode === 'guest' ? 'e.g. Alex Johnson (optional)' : 'e.g. Alex Johnson'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#ff4d2d]"
                />
              </div>
            </div>
          )}

          {mode !== 'guest' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#ff4d2d]"
                />
              </div>
            </div>
          )}

          {mode !== 'guest' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#ff4d2d]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-[#ff4d2d] py-2.5 text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors disabled:opacity-50"
          >
            <span>
              {mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                ? 'Create account'
                : 'Continue as guest'}
            </span>
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
                  className="text-slate-200 hover:underline"
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
                  className="text-slate-200 hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Want a host account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-slate-200 hover:underline"
                >
                  Register
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
