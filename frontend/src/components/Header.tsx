'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Sparkles, User as UserIcon, Share2, UploadCloud, LogOut } from 'lucide-react';
import { User, RoomRole } from '../types';

interface HeaderProps {
  user?: User | null;
  roomName?: string;
  role?: RoomRole;
  onOpenInvite?: () => void;
  onOpenUpload?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  roomName,
  role,
  onOpenInvite,
  onOpenUpload,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090a10]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Room Name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                SnapRoom
              </span>
              <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold -mt-1">
                Facial AI Sync
              </span>
            </div>
          </Link>

          {roomName && (
            <div className="hidden sm:flex items-center gap-2 pl-4 ml-4 border-l border-white/10">
              <span className="text-xs text-slate-400">Event:</span>
              <span className="text-sm font-semibold text-slate-200 max-w-[200px] truncate">
                {roomName}
              </span>
              {role === 'LEADER' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
                  <Sparkles className="h-3 w-3" /> Host
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenInvite && (
            <button
              onClick={onOpenInvite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:border-indigo-400/30 transition-all cursor-pointer"
              title="Share Room Invite"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Invite Guests</span>
            </button>
          )}

          {role === 'LEADER' && onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload Photos</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 px-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                  <UserIcon className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-slate-300 max-w-[120px] truncate">
                  {user.displayName}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
