'use client';

import React, { useState } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { roomService } from '../services/roomService';
import { DownloadItemDto } from '../types';

interface ZipDownloadButtonProps {
  roomId: string;
  selectedItems: DownloadItemDto[];
  variant?: 'primary' | 'secondary' | 'floating';
  customLabel?: string;
  className?: string;
  onDownloadComplete?: () => void;
}

export const ZipDownloadButton: React.FC<ZipDownloadButtonProps> = ({
  roomId,
  selectedItems,
  variant = 'primary',
  customLabel,
  className = '',
  onDownloadComplete,
}) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const handleDownload = async () => {
    if (selectedItems.length === 0 || isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const zipBlob = await roomService.downloadZip(roomId, selectedItems);

      // Trigger native browser download via temporary object URL
      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `SnapRoom_Photos_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Confetti fallback
      }

      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 3000);

      if (onDownloadComplete) {
        onDownloadComplete();
      }
    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Unable to download ZIP archive.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'floating':
        return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl shadow-teal-500/25 hover:from-emerald-400 hover:to-cyan-400';
      case 'secondary':
        return 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500';
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={selectedItems.length === 0 || isDownloading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${getButtonStyles()} ${className}`}
      title={
        selectedItems.length === 0
          ? 'Select at least one photo to download'
          : `Download ${selectedItems.length} photos as ZIP`
      }
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating ZIP...</span>
        </>
      ) : downloadSuccess ? (
        <>
          <Check className="h-4 w-4 text-emerald-300" />
          <span>Downloaded!</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>
            {customLabel ||
              `Download ZIP ${selectedItems.length > 0 ? `(${selectedItems.length})` : ''}`}
          </span>
        </>
      )}
    </button>
  );
};
