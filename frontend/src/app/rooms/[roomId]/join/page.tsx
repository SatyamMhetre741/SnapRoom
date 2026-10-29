'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, ArrowLeft, Users, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<EnrollmentResponse | null>(null);

  useEffect(() => {
    let user = authService.getCurrentUser();
    if (!user) {
      user = authService.getOrCreateGuestUser('Guest Attendee');
    }
    setCurrentUser(user);

    const loadRoom = async () => {
      try {
        const found = await roomService.getRoomByInviteCode(inviteCode);
        setRoom(found);
      } catch (err) {
        console.warn('Could not load room by invite code:', err);
      } finally {
        setIsLoadingRoom(false);
      }
    };

    if (inviteCode) {
      loadRoom();
    }
  }, [inviteCode]);

  const handleEnrolled = (result: EnrollmentResponse) => {
    setEnrollmentSuccess(result);
    setTimeout(() => {
      const destinationRoomId = result.roomId || room?.id || 'demo-room';
      router.push(`/rooms/${destinationRoomId}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Header user={currentUser} />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-lg mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Home</span>
          </Link>

          {/* Room Banner Card */}
          <div className="mb-6 p-4 rounded-2xl bg-[#12141f] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                Joining Event Room
              </span>
              <h2 className="text-base font-bold text-white">
                {isLoadingRoom ? 'Locating Room...' : room?.name || `Room ${inviteCode}`}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              <span className="font-mono text-indigo-300 font-semibold">{inviteCode}</span>
            </div>
          </div>

          {/* Success Interstitial Overlay */}
          {enrollmentSuccess ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-[#12141f]/95 p-8 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Face Enrolled!</h3>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Your 512-D face embedding is active. Redirecting you into the room workspace now...
              </p>
              <div className="h-1.5 w-48 mx-auto rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[pulse_1s_infinite] w-full" />
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
        <div className="min-h-screen flex items-center justify-center bg-[#090a10] text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      }
    >
      <JoinRoomContent />
    </Suspense>
  );
}
