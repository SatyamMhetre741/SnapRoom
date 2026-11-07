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

      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `SendMyPics_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      try {
        confetti({
          particleCount: 60,
          spread: 55,
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
    } catch (err: unknown) {
      alert(`Download failed: ${(err as Error).message || 'Unable to download ZIP archive.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'floating':
        return 'bg-[#ff4d2d] text-white hover:bg-[#e03e1e] shadow-lg';
      case 'secondary':
        return 'bg-[#1a1e27] hover:bg-[#222834] text-slate-200 border border-white/[0.1]';
      case 'primary':
      default:
        return 'bg-[#ff4d2d] text-white hover:bg-[#e03e1e]';
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={selectedItems.length === 0 || isDownloading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${getButtonStyles()} ${className}`}
      title={
        selectedItems.length === 0
          ? 'Select at least one photo to download'
          : `Download ${selectedItems.length} photo(s) as ZIP`
      }
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Creating ZIP...</span>
        </>
      ) : downloadSuccess ? (
        <>
          <Check className="h-3.5 w-3.5 text-white" />
          <span>Downloaded</span>
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          <span>
            {customLabel ||
              `Download ZIP ${selectedItems.length > 0 ? `(${selectedItems.length})` : ''}`}
          </span>
        </>
      )}
    </button>
  );
};
