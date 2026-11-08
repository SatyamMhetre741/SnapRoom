'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import { useIsMounted } from '../hooks/useIsMounted';

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
  const isMounted = useIsMounted();

  const joinUrl = isMounted
    ? `${window.location.origin}/rooms/${inviteCode}/join`
    : `https://sendmypics.app/rooms/${inviteCode}/join`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#14171d] p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <h3 className="text-lg font-semibold text-white tracking-tight">{roomName}</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Display this QR code or share the invite code so guests can find their photos.
        </p>

        {/* QR Code Container */}
        <div className="mt-5 flex justify-center">
          <div className="p-4 rounded-xl bg-white shadow-xl">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Invite Code Block */}
        <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-[#0b0c0e] border border-white/[0.08]">
          <div className="text-left">
            <span className="text-[11px] text-slate-400">
              Invite code
            </span>
            <p className="font-mono text-base font-bold text-white tracking-wide">{inviteCode}</p>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] bg-[#1a1e27] hover:bg-[#222834] text-xs font-medium text-slate-200 transition-colors"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy code</span>
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
            className="flex-1 bg-[#0b0c0e] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-[#0b0c0e] hover:bg-slate-200 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy link</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-[11px] text-slate-400">
          Guests take a quick selfie to enter the room.
        </p>
      </div>
    </div>
  );
};
