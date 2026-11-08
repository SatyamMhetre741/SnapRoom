'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Share2, Upload, LogOut, User as UserIcon } from 'lucide-react';
import { User, RoomRole } from '../types';

interface HeaderProps {
  user?: User | null;
  roomName?: string;
  role?: RoomRole;
  onOpenInvite?: () => void;
  onOpenUpload?: () => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  roomName,
  role,
  onOpenInvite,
  onOpenUpload,
  onLogout,
  onOpenAuth,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0b0c0e]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Room Identification */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1e27] border border-white/[0.12] text-slate-200 transition-colors group-hover:border-[#ff4d2d]/60">
              <Camera className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#ff4d2d]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-white">
                SendMyPics
              </span>
              <span className="text-[11px] text-slate-400">
                Event photo delivery
              </span>
            </div>
          </Link>

          {roomName && (
            <div className="hidden sm:flex items-center gap-2.5 pl-4 ml-2 border-l border-white/[0.08]">
              <span className="text-xs text-slate-400">Room:</span>
              <span className="text-sm font-medium text-slate-100 max-w-[220px] truncate">
                {roomName}
              </span>
              {role === 'LEADER' ? (
                <span className="rounded bg-[#ff4d2d]/10 px-2 py-0.5 text-[11px] font-medium text-[#ff7054] border border-[#ff4d2d]/30">
                  Host
                </span>
              ) : (
                <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400 border border-sky-500/30">
                  Attendee
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {onOpenInvite && (
            <button
              onClick={onOpenInvite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#14171d] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1a1e27] hover:border-white/20 transition-colors"
              title="Share event invite code or QR"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Invite guests</span>
            </button>
          )}

          {role === 'LEADER' && onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff4d2d] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload photos</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#14171d] py-1 px-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.08] text-slate-300">
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
            <button
              onClick={onOpenAuth}
              className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
