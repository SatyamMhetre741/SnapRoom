'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Users,
  Shield,
  Zap,
  Download,
  QrCode,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { authService } from '../services/authService';
import { roomService } from '../services/roomService';
import { User, Room } from '../types';

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'guest'>('guest');

  // Room Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Join Room with Code
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Recent rooms
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // Load recent rooms from storage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('snaproom_local_rooms');
      if (stored) {
        try {
          setRecentRooms(JSON.parse(stored));
        } catch {
          setRecentRooms([]);
        }
      }
    }
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    // Ensure user exists
    if (!user) {
      authService.getOrCreateGuestUser('Event Host');
      setUser(authService.getCurrentUser());
    }

    setIsCreatingRoom(true);
    try {
      const room = await roomService.createRoom(newRoomName.trim());
      setShowCreateModal(false);
      router.push(`/rooms/${room.id}`);
    } catch (err: any) {
      alert(`Could not create room: ${err.message || 'Please try again.'}`);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim();
    if (!clean) return;
    router.push(`/rooms/${clean}/join`);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Header
        user={user}
        onLogout={handleLogout}
      />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-36">
          {/* Ambient Lighting Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-2/3 right-10 w-[300px] h-[300px] bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Top Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-8 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Next-Gen Facial Routing for Event Photos</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Never hunt through{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                thousands of party photos
              </span>{' '}
              again.
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              SnapRoom automatically scans event photo piles with high-precision AI facial vectors.
              Enroll with a 1-second webcam selfie, and all photos of you instantly populate your
              private &quot;For You&quot; gallery.
            </p>

            {/* Action Cards (Create Room & Join with Code) */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Card 1: Host an Event */}
              <div className="rounded-3xl border border-white/10 bg-[#12141f]/80 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between text-left relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Create an Event Room</h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Host a wedding, conference, or party. Get a shareable QR code and bulk-upload
                    unlimited event pictures directly to cloud storage.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
                >
                  <span>Start New Room</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Card 2: Join with Code */}
              <div className="rounded-3xl border border-white/10 bg-[#12141f]/80 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between text-left relative overflow-hidden group hover:border-purple-500/40 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 mb-4">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Join with Invite Code</h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Attending an event? Enter the room invite code to take your biometric selfie and
                    unlock your photos.
                  </p>
                </div>
                <form onSubmit={handleJoinWithCode} className="mt-6 flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. party-demo"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="submit"
                    disabled={!joinCodeInput.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>

            {/* Quick Demo Fast-Track */}
            <div className="mt-8">
              <button
                onClick={() => router.push('/rooms/demo-party/join')}
                className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Try Demo Event Room (&quot;demo-party&quot;)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Recent Rooms (if any created locally) */}
        {recentRooms.length > 0 && (
          <section className="py-8 border-y border-white/5 bg-white/[0.01]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Recent Rooms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => router.push(`/rooms/${room.id}`)}
                    className="p-4 rounded-2xl bg-[#12141f] border border-white/10 hover:border-indigo-400/40 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {room.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Code: {room.inviteCode}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Feature Highlights Section */}
        <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Built for speed, accuracy, and total privacy
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              How SnapRoom routes thousands of photos in seconds using InsightFace and pgvector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-[#12141f]/70 border border-white/10 relative overflow-hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">1. Instant Face Vector</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Take a quick webcam selfie in browser. We extract a 512-dimensional vector and
                discard your raw selfie bytes immediately.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-[#12141f]/70 border border-white/10 relative overflow-hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">2. Direct Cloud Upload</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Leaders upload high-res photos directly to Cloudflare R2 or MinIO via presigned PUT
                URLs, skipping server bottlenecks completely.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-[#12141f]/70 border border-white/10 relative overflow-hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 mb-4">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">3. Streaming ZIP Archives</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Download all matched photos of you in one click. Streaming byte pipeline generates
                ZIP files on-the-fly with zero disk delay.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">SnapRoom</span>
            <span>— Facial-Routing Photo Sharing</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Spring Boot 3.x</span>
            <span>•</span>
            <span>InsightFace CPU</span>
            <span>•</span>
            <span>pgvector</span>
          </div>
        </div>
      </footer>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141f] p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white">Name Your Event Room</h3>
            <p className="text-xs text-slate-400 mt-1">
              Give your event a memorable title (e.g., Wedding Reception, Annual Hackathon).
            </p>

            <form onSubmit={handleCreateRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Room Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Maya & Ethan's Wedding"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingRoom}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim() || isCreatingRoom}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingRoom ? 'Creating...' : 'Create & Open Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setShowAuthModal(false);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
