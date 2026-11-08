'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  FolderUp,
  Download,
  ShieldCheck,
  Plus,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { authService } from '../services/authService';
import { roomService } from '../services/roomService';
import { useIsMounted } from '../hooks/useIsMounted';
import { User } from '../types';

export default function HomePage() {
  const router = useRouter();
  const isMounted = useIsMounted();

  const [localUser, setLocalUser] = useState<User | null>(null);
  const user = localUser || (isMounted ? authService.getCurrentUser() : null);
  const recentRooms = isMounted ? roomService.getAllLocalRooms() : [];

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authNextPath, setAuthNextPath] = useState<string | null>(null);

  // Room Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Join Room with Code
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    if (!user) {
      setAuthNextPath(null);
      setShowAuthModal(true);
      return;
    }

    setIsCreatingRoom(true);
    try {
      const room = await roomService.createRoom(newRoomName.trim());
      setShowCreateModal(false);
      router.push(`/rooms/${room.id}`);
    } catch (err: unknown) {
      alert(`Could not create room: ${(err as Error).message || 'Please try again.'}`);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim();
    if (!clean) return;
    if (!user) {
      setAuthNextPath(`/rooms/${clean}/join`);
      setShowAuthModal(true);
      return;
    }
    router.push(`/rooms/${clean}/join`);
  };

  const handleLogout = () => {
    authService.logout();
    setLocalUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c0e] text-slate-100">
      <Header user={user} onLogout={handleLogout} onOpenAuth={() => setShowAuthModal(true)} />

      <main className="flex-1">
        {/* Editorial Split Hero */}
        <section className="relative border-b border-white/[0.08] pt-14 pb-20 lg:pt-24 lg:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              {/* Left Column: Editorial Statement & Value */}
              <div className="lg:col-span-7 flex flex-col items-start">
                <div className="flex items-center gap-2 text-xs font-medium text-[#ff7054] mb-6">
                  <span className="h-2 w-2 rounded-full bg-[#ff4d2d]" />
                  <span>Private event photo distribution</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] max-w-2xl">
                  Every event photo of you. Delivered without the hunt.
                </h1>

                <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
                  No more scrolling through three thousand pictures on a shared drive.
                  Hosts drop the event roll, guests align a one-second selfie, and every picture
                  featuring your face lands in your personal gallery.
                </p>

                {/* Practical Guarantees List */}
                <div className="mt-8 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Raw selfies are immediately discarded after vector alignment</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Download className="h-4 w-4 text-sky-400 flex-shrink-0" />
                    <span>Original uncompressed resolution with streaming batch ZIP downloads</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <QrCode className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Instant access via QR code or invite link without required app installation</span>
                  </div>
                </div>

                {/* Sample Demo Link */}
                <div className="mt-8">
                  <button
                    onClick={() => router.push('/rooms/demo-party/join')}
                    className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    <span>Explore sample event workspace</span>
                    <span className="font-mono text-slate-500">(demo-party)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: High-Utility Event Station */}
              <div className="lg:col-span-5 w-full">
                <div className="rounded-2xl border border-white/[0.1] bg-[#13161c] p-6 lg:p-7 shadow-2xl">
                  {/* Station Mode: Join an event */}
                  <div>
                    <h2 className="text-lg font-semibold text-white">Join an event</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter the room code from your invitation or host to unlock your photos.
                    </p>

                    <form onSubmit={handleJoinWithCode} className="mt-4 flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. party-demo"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value)}
                        className="flex-1 bg-[#0b0c0e] border border-white/[0.12] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff4d2d]"
                      />
                      <button
                        type="submit"
                        disabled={!joinCodeInput.trim()}
                        className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-[#0b0c0e] hover:bg-slate-200 transition-colors disabled:opacity-40"
                      >
                        Find photos
                      </button>
                    </form>
                  </div>

                  <div className="my-6 border-t border-white/[0.08]" />

                  {/* Station Mode: Host an event */}
                  <div>
                    <h3 className="text-sm font-semibold text-white">Hosting an event?</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Create an event room, bulk-upload your camera files, and print or share your room QR code for attendees.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff4d2d] py-2.5 px-4 text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create new event room</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Rooms (if present locally) */}
        {recentRooms.length > 0 && (
          <section className="py-8 border-b border-white/[0.08] bg-[#101319]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h3 className="text-xs font-medium text-slate-400 mb-3">
                Your recent rooms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => router.push(`/rooms/${room.id}`)}
                    className="p-3.5 rounded-xl bg-[#14171d] border border-white/[0.08] hover:border-white/20 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-white group-hover:text-[#ff7054] transition-colors">
                        {room.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Code: {room.inviteCode}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* The 3-Step Process (Physical Workflow) */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              From camera card to guest phone in minutes
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Designed for photographers and event organizers who want seamless delivery without manual tagging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl bg-[#13161c] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1e27] text-slate-200 border border-white/[0.1] mb-5">
                  <FolderUp className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">1. Direct roll upload</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Drop hundreds of high-res photos into the room. Files transfer directly to fast storage without server bottlenecks.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl bg-[#13161c] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1e27] text-slate-200 border border-white/[0.1] mb-5">
                  <Camera className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="text-base font-semibold text-white">2. One-second selfie</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Guests scan the room QR code and snap a quick selfie. The system identifies matches without storing biometric images.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl bg-[#13161c] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1e27] text-slate-200 border border-white/[0.1] mb-5">
                  <Download className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-white">3. Batch ZIP download</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Attendees view their matched pictures and download every photo in full original quality with one click.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Camera className="h-4 w-4" />
            <span className="font-medium">SendMyPics</span>
            <span className="text-slate-500">— Event photo distribution</span>
          </div>
          <div className="text-slate-400">
            Privacy-first photo routing. Raw biometric selfies are never retained.
          </div>
        </div>
      </footer>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#14171d] p-6 shadow-2xl relative">
            <h3 className="text-lg font-semibold text-white">Name your event room</h3>
            <p className="text-xs text-slate-400 mt-1">
              Give your event a clear title that guests will recognize on their phones.
            </p>

            <form onSubmit={handleCreateRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Room name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Maya & Ethan Wedding"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-white/[0.12] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#ff4d2d]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingRoom}
                  className="flex-1 py-2 rounded-lg border border-white/[0.1] bg-[#1a1e27] text-xs font-medium text-slate-300 hover:bg-[#222834] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim() || isCreatingRoom}
                  className="flex-1 py-2 rounded-lg bg-[#ff4d2d] text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors disabled:opacity-50"
                >
                  {isCreatingRoom ? 'Creating...' : 'Create room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onSuccess={(loggedInUser) => {
            setLocalUser(loggedInUser);
            setShowAuthModal(false);
            if (authNextPath) {
              router.push(authNextPath);
              setAuthNextPath(null);
            }
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
