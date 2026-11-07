'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Share2,
  Upload,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Header } from '../../../components/Header';
import { RoomGallery } from '../../../components/RoomGallery';
import { PhotoUploader } from '../../../components/PhotoUploader';
import { RoomInviteModal } from '../../../components/RoomInviteModal';
import { roomService } from '../../../services/roomService';
import { authService } from '../../../services/authService';
import { Room, User, RoomRole } from '../../../types';

function RoomWorkspaceContent() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params?.roomId as string) || '';

  const [currentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      return authService.getCurrentUser() || authService.getOrCreateGuestUser('Host User');
    }
    return null;
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [userRole, setUserRole] = useState<RoomRole>('LEADER');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (roomId) {
      roomService
        .getRoom(roomId)
        .then((data) => {
          if (isMounted) {
            setRoom(data);
            if (data.userRole) {
              setUserRole(data.userRole);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not load room:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    roomService.getRoom(roomId).then((data) => setRoom(data));
  };

  const isLeader = userRole === 'LEADER';

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c0e] text-slate-100">
      {/* Top Navbar */}
      <Header
        user={currentUser}
        roomName={room?.name}
        role={userRole}
        onOpenInvite={() => setShowInviteModal(true)}
        onOpenUpload={isLeader ? () => setShowUploadModal(true) : undefined}
      />

      <main className="flex-1">
        {/* Room Header Banner */}
        <section className="border-b border-white/[0.08] bg-[#101319] py-7">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Left Column: Room title & details */}
              <div>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All events</span>
                </button>

                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {room?.name || 'Event Room'}
                  </h1>
                  {isLeader ? (
                    <span className="rounded bg-[#ff4d2d]/10 px-2.5 py-0.5 text-xs font-medium text-[#ff7054] border border-[#ff4d2d]/30">
                      Host view
                    </span>
                  ) : (
                    <span className="rounded bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-400 border border-sky-500/30">
                      Attendee view
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <span>Invite code:</span>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="font-mono text-white bg-[#1a1e27] hover:bg-[#222834] px-2 py-0.5 rounded border border-white/[0.1] transition-colors"
                    title="Click to view invite QR and share link"
                  >
                    {room?.inviteCode || roomId}
                  </button>
                </div>
              </div>

              {/* Right Column: Role Switcher & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Switch Role Pill (For testing/previewing host vs guest experiences) */}
                <div className="flex items-center rounded-lg bg-[#14171d] p-1 border border-white/[0.08] text-xs">
                  <button
                    onClick={() => setUserRole('LEADER')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      userRole === 'LEADER'
                        ? 'bg-[#1e232e] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Host
                  </button>
                  <button
                    onClick={() => setUserRole('MEMBER')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      userRole === 'MEMBER'
                        ? 'bg-[#1e232e] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Attendee
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#14171d] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1a1e27] transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Invite / QR</span>
                </button>

                {isLeader && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff4d2d] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload photos</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Workspace */}
        <RoomGallery
          roomId={roomId}
          isLeader={isLeader}
          onOpenUpload={() => setShowUploadModal(true)}
        />
      </main>

      {/* Upload Photos Modal */}
      {showUploadModal && (
        <PhotoUploader
          roomId={roomId}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Share / Invite Modal */}
      {showInviteModal && (
        <RoomInviteModal
          inviteCode={room?.inviteCode || roomId}
          roomName={room?.name || 'Event Room'}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

export default function RoomWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0c0e] text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <RoomWorkspaceContent />
    </Suspense>
  );
}
