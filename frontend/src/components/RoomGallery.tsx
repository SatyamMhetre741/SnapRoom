'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Images,
  Check,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  User,
} from 'lucide-react';
import { PhotoItem, DownloadItemDto, RoomStatusResponse } from '../types';
import { roomService } from '../services/roomService';
import { ZipDownloadButton } from './ZipDownloadButton';

interface RoomGalleryProps {
  roomId: string;
  isLeader: boolean;
  onOpenUpload?: () => void;
}

export const RoomGallery: React.FC<RoomGalleryProps> = ({
  roomId,
  isLeader,
  onOpenUpload,
}) => {
  // Tabs: 'forYou' vs 'all'
  const [activeTab, setActiveTab] = useState<'forYou' | 'all'>('forYou');

  const [forYouPhotos, setForYouPhotos] = useState<PhotoItem[]>([]);
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Background processing status
  const [roomStatus, setRoomStatus] = useState<RoomStatusResponse | null>(null);

  // Fetch photos helper
  const fetchPhotos = useCallback(async () => {
    try {
      const [myPhotos, entireGallery, status] = await Promise.all([
        roomService.getMyPhotos(roomId),
        roomService.getAllPhotos(roomId),
        roomService.getRoomStatus(roomId),
      ]);
      setForYouPhotos(myPhotos);
      setAllPhotos(entireGallery);
      setRoomStatus(status);
    } catch (err: unknown) {
      console.warn('Failed to fetch room photos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Initial load
  useEffect(() => {
    let isSubscribed = true;

    const loadInitialPhotos = async () => {
      try {
        const [myPhotos, entireGallery, status] = await Promise.all([
          roomService.getMyPhotos(roomId),
          roomService.getAllPhotos(roomId),
          roomService.getRoomStatus(roomId),
        ]);
        if (isSubscribed) {
          setForYouPhotos(myPhotos);
          setAllPhotos(entireGallery);
          setRoomStatus(status);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.warn('Failed to load initial photos:', err);
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadInitialPhotos();

    return () => {
      isSubscribed = false;
    };
  }, [roomId]);

  // Async Polling: Poll every 5 seconds if photos are pending or processing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkAndPoll = async () => {
      try {
        const status = await roomService.getRoomStatus(roomId);
        setRoomStatus(status);

        if (status.isProcessing || status.pendingCount > 0 || status.processingCount > 0) {
          const [myPhotos, entireGallery] = await Promise.all([
            roomService.getMyPhotos(roomId),
            roomService.getAllPhotos(roomId),
          ]);
          setForYouPhotos(myPhotos);
          setAllPhotos(entireGallery);
        }
      } catch (err: unknown) {
        console.warn('Polling status error:', err);
      }
    };

    interval = setInterval(checkAndPoll, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [roomId]);

  const currentList = useMemo(() => {
    return activeTab === 'forYou' ? forYouPhotos : allPhotos;
  }, [activeTab, forYouPhotos, allPhotos]);

  // Selection handlers
  const toggleSelectPhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === currentList.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(currentList.map((p) => p.id)));
    }
  };

  // Convert selected photo IDs to DownloadItemDto format for ZIP
  const selectedDownloadItems: DownloadItemDto[] = useMemo(() => {
    return currentList
      .filter((p) => selectedPhotoIds.has(p.id))
      .map((p) => ({
        objectKey: p.objectKey,
        fileName: p.fileName,
      }));
  }, [currentList, selectedPhotoIds]);

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextLightbox = () => {
    if (lightboxIndex !== null && currentList.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % currentList.length);
    }
  };

  const prevLightbox = () => {
    if (lightboxIndex !== null && currentList.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + currentList.length) % currentList.length);
    }
  };

  const activeLightboxPhoto = lightboxIndex !== null ? currentList[lightboxIndex] : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Background Processing Status */}
      {roomStatus && (roomStatus.isProcessing || roomStatus.pendingCount > 0 || roomStatus.processingCount > 0) && (
        <div className="mb-6 rounded-xl border border-sky-500/30 bg-[#10141d] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
            <div>
              <p className="text-xs font-medium text-slate-200">
                Matching photos in the background
              </p>
              <p className="text-[11px] text-slate-400">
                New photos are being analyzed. Newly detected matches will show up automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchPhotos()}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      )}

      {/* Gallery Header Controls: Tabs + Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        {/* Gallery Segmented Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[#14171d] border border-white/[0.08]">
          <button
            onClick={() => {
              setActiveTab('forYou');
              setSelectedPhotoIds(new Set());
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'forYou'
                ? 'bg-[#1e232e] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5 text-sky-400" />
            <span>My photos</span>
            <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.2 rounded">
              {forYouPhotos.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedPhotoIds(new Set());
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#1e232e] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Images className="h-3.5 w-3.5" />
            <span>All event photos</span>
            <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.2 rounded">
              {allPhotos.length}
            </span>
          </button>
        </div>

        {/* Multi-Select & Bulk ZIP Action */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {currentList.length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] bg-[#14171d] text-xs text-slate-300 hover:bg-[#1a1e27] transition-colors"
              >
                {selectedPhotoIds.size === currentList.length && currentList.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-[#ff7054]" />
                ) : (
                  <Square className="h-4 w-4 text-slate-500" />
                )}
                <span>
                  {selectedPhotoIds.size === currentList.length ? 'Deselect all' : 'Select all'}
                </span>
              </button>

              <ZipDownloadButton
                roomId={roomId}
                selectedItems={
                  selectedDownloadItems.length > 0
                    ? selectedDownloadItems
                    : currentList.map((p) => ({ objectKey: p.objectKey, fileName: p.fileName }))
                }
                customLabel={
                  selectedDownloadItems.length > 0
                    ? `Download selected (.zip)`
                    : `Download all (.zip)`
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Gallery Grid Content */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mb-3" />
          <p className="text-xs text-slate-400">Loading photos...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
          <div className="h-12 w-12 rounded-xl bg-[#14171d] border border-white/[0.1] flex items-center justify-center text-slate-400 mb-4">
            {activeTab === 'forYou' ? (
              <User className="h-6 w-6" />
            ) : (
              <Images className="h-6 w-6" />
            )}
          </div>
          <h4 className="text-base font-semibold text-white mb-1">
            {activeTab === 'forYou' ? 'No photos of you found yet' : 'No photos in this room yet'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            {activeTab === 'forYou'
              ? 'Photos are scanned automatically when uploaded. If the host recently added photos, give it a moment or check back shortly.'
              : 'The room host has not uploaded any event photos yet. Once uploaded, they will be accessible here.'}
          </p>

          {isLeader && onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ff4d2d] px-4 py-2 text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors"
            >
              Upload photos
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {currentList.map((photo, index) => {
            const isSelected = selectedPhotoIds.has(photo.id);
            const imageUrl = photo.presignedGetUrl || '/placeholder-photo.jpg';

            return (
              <div
                key={photo.id}
                onClick={() => openLightbox(index)}
                className={`group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#14171d] border cursor-pointer transition-all select-none ${
                  isSelected
                    ? 'border-[#ff4d2d] ring-1 ring-[#ff4d2d]'
                    : 'border-white/[0.08] hover:border-white/25'
                }`}
              >
                {/* Photo Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={photo.fileName}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                />

                {/* Subtle vignette on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Selection Checkbox (Top Left) */}
                <div
                  onClick={(e) => toggleSelectPhoto(photo.id, e)}
                  className={`absolute top-2.5 left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md backdrop-blur-md transition-colors ${
                    isSelected
                      ? 'bg-[#ff4d2d] text-white shadow-sm'
                      : 'bg-black/50 text-transparent border border-white/30 hover:border-white group-hover:text-white/40'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </div>

                {/* Match Score Indicator (Top Right) */}
                {photo.similarityScore !== undefined && photo.similarityScore > 0 && (
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-slate-200 border border-white/10">
                    <span>{Math.round(photo.similarityScore * 100)}% match</span>
                  </div>
                )}

                {/* Bottom filename and zoom icon on hover */}
                <div className="absolute bottom-0 inset-x-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-white">
                  <span className="text-[11px] truncate max-w-[80%] text-slate-300">
                    {photo.fileName}
                  </span>
                  <Eye className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Batch Selection Bar */}
      {selectedPhotoIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3.5 rounded-xl border border-white/[0.15] bg-[#14171d]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff4d2d] text-[11px] font-bold text-white">
                {selectedPhotoIds.size}
              </span>
              <span className="text-xs font-medium text-slate-200">photos selected</span>
            </div>

            <div className="h-4 w-px bg-white/20" />

            <button
              onClick={() => setSelectedPhotoIds(new Set())}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>

            <ZipDownloadButton
              roomId={roomId}
              selectedItems={selectedDownloadItems}
              variant="floating"
              customLabel={`Download ZIP (${selectedPhotoIds.size})`}
            />
          </div>
        </div>
      )}

      {/* Full-screen Lightbox Modal */}
      {activeLightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous arrow */}
          <button
            onClick={prevLightbox}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Next arrow */}
          <button
            onClick={nextLightbox}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Main Photo Container */}
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeLightboxPhoto.presignedGetUrl || '/placeholder-photo.jpg'}
              alt={activeLightboxPhoto.fileName}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />

            {/* Lightbox Footer Bar */}
            <div className="mt-4 flex items-center justify-between w-full max-w-md px-4 py-2 rounded-lg bg-[#14171d] border border-white/[0.1] text-xs text-slate-300">
              <span className="font-medium truncate mr-2">
                {activeLightboxPhoto.fileName}
              </span>

              <div className="flex items-center gap-3">
                {activeLightboxPhoto.similarityScore !== undefined && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {Math.round(activeLightboxPhoto.similarityScore * 100)}% match
                  </span>
                )}

                <a
                  href={activeLightboxPhoto.presignedGetUrl}
                  download={activeLightboxPhoto.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-white hover:text-[#ff7054] font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Save file</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
