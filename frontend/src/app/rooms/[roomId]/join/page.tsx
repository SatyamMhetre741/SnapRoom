'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { WebcamEnroll } from '../../../../components/WebcamEnroll';
import { Header } from '../../../../components/Header';
import { roomService } from '../../../../services/roomService';
import { authService } from '../../../../services/authService';
import { Room, User, EnrollmentResponse } from '../../../../types';

function JoinRoomContent() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = (params?.roomId as string) || (params?.inviteCode as string) || '';

  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      return authService.getCurrentUser() || authService.getOrCreateGuestUser('Guest Attendee');
    }
    return null;
  });
  const [isLoadingRoom, setIsLoadingRoom] = useState(Boolean(inviteCode));
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<EnrollmentResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (inviteCode) {
      roomService
        .getRoomByInviteCode(inviteCode)
        .then((found) => {
          if (isMounted) {
            setRoom(found);
            setIsLoadingRoom(false);
          }
        })
        .catch((err: unknown) => {
          console.warn('Could not load room by invite code:', err);
          if (isMounted) {
            setIsLoadingRoom(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [inviteCode]);

  const handleEnrolled = (result: EnrollmentResponse) => {
    setEnrollmentSuccess(result);
    setTimeout(() => {
      const destinationRoomId = result.roomId || room?.id || 'demo-room';
      router.push(`/rooms/${destinationRoomId}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c0e] text-slate-100">
      <Header user={currentUser} />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to home</span>
          </Link>

          {/* Room Banner */}
          <div className="mb-4 p-3.5 rounded-xl bg-[#14171d] border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">
                Joining event
              </span>
              <h2 className="text-sm font-semibold text-white">
                {isLoadingRoom ? 'Locating event room...' : room?.name || `Room ${inviteCode}`}
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-200 bg-[#0b0c0e] px-2.5 py-1 rounded border border-white/[0.08]">
              {inviteCode}
            </div>
          </div>

          {/* Success Overlay */}
          {enrollmentSuccess ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-[#14171d] p-8 text-center shadow-2xl">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Face matched</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Opening your personalized event gallery now...
              </p>
              <div className="h-1 w-36 mx-auto rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-500 w-full animate-pulse" />
              </div>
            </div>
          ) : (
            <WebcamEnroll
              inviteCode={inviteCode}
              onEnrolled={handleEnrolled}
              onCancel={() => router.push('/')}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0c0e] text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <JoinRoomContent />
    </Suspense>
  );
}
