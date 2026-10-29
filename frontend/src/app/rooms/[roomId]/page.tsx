'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  Share2,
  UploadCloud,
  Users,
  Shield,
  ArrowLeft,
  Crown,
  UserCheck,
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

  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<RoomRole>('LEADER');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    let user = authService.getCurrentUser();
    if (!user) {
      user = authService.getOrCreateGuestUser('Host User');
    }
    setCurrentUser(user);

    const loadRoom = async () => {
      try {
        const data = await roomService.getRoom(roomId);
        setRoom(data);
        if (data.userRole) {
          setUserRole(data.userRole);
        }
      } catch (err) {
        console.warn('Could not load room:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (roomId) {
      loadRoom();
    }
  }, [roomId]);

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    roomService.getRoom(roomId).then((data) => setRoom(data));
  };

  const isLeader = userRole === 'LEADER';

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
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
        <section className="border-b border-white/10 bg-gradient-to-b from-[#12141f] to-[#090a10] py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Column: Room title & badges */}
              <div>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All Events</span>
                </button>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  {room?.name || 'Event Room'}
                  {isLeader ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                      <Crown className="h-3.5 w-3.5" /> Host Mode
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                      <UserCheck className="h-3.5 w-3.5" /> Enrolled Attendee
                    </span>
                  )}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500">Invite Code:</span>
                    <span className="font-mono text-indigo-300 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {room?.inviteCode || roomId}
                    </span>
                  </span>
                  <span>•</span>
                  <span>Direct Presigned S3/R2 Pipeline</span>
                  <span>•</span>
                  <span>InsightFace 512-D Cosine Routing</span>
                </div>
              </div>

              {/* Right Column: Actions & Role Switcher for Testing */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Switch Role Pill (Convenience for testing both host and guest views) */}
                <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                  <button
                    onClick={() => setUserRole('LEADER')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      userRole === 'LEADER'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Host View
                  </button>
                  <button
                    onClick={() => setUserRole('MEMBER')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      userRole === 'MEMBER'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Attendee View
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span>Share QR / Invite</span>
                </button>

                {isLeader && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload Photos</span>
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
        <div className="min-h-screen flex items-center justify-center bg-[#090a10] text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      }
    >
      <RoomWorkspaceContent />
    </Suspense>
  );
}
