'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Sparkles, ExternalLink } from 'lucide-react';

interface RoomInviteModalProps {
  inviteCode: string;
  roomName: string;
  onClose: () => void;
}

export const RoomInviteModal: React.FC<RoomInviteModalProps> = ({
  inviteCode,
  roomName,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Build join URL
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/rooms/${inviteCode}/join`
    : `https://snaproom.app/rooms/${inviteCode}/join`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141f] p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
          <QrCode className="h-3.5 w-3.5" /> Event Share Card
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">{roomName}</h3>
        <p className="text-xs text-slate-400 mt-1">
          Guests can scan the QR code to take their webcam selfie and join immediately.
        </p>

        {/* QR Code Container */}
        <div className="mt-5 flex justify-center">
          <div className="p-4 rounded-2xl bg-white shadow-2xl ring-4 ring-indigo-500/20">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Invite Code Badge */}
        <div className="mt-6 flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-left">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Room Invite Code
            </p>
            <p className="font-mono text-base font-bold text-indigo-300">{inviteCode}</p>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-indigo-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Shareable Link Input */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>New guests will enroll their face vector before entering</span>
        </div>
      </div>
    </div>
  );
};
