'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Check,
  AlertCircle,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { roomService } from '../services/roomService';
import { EnrollmentResponse } from '../types';

interface WebcamEnrollProps {
  inviteCode: string;
  onEnrolled: (result: EnrollmentResponse) => void;
  onCancel?: () => void;
}

export const WebcamEnroll: React.FC<WebcamEnrollProps> = ({
  inviteCode,
  onEnrolled,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to cleanly terminate any active camera streams
  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  // Start webcam with front facing mode & 1280x720 target
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Webcam initiation failed:', error);
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission was denied. You can upload a selfie from your photo library instead.'
          : error.message || 'Unable to access your camera.'
      );
    } finally {
      setIsInitializing(false);
    }
  }, [stream]);

  // Initialize camera on mount and ensure cleanup on unmount
  useEffect(() => {
    let active = true;

    if (!navigator?.mediaDevices?.getUserMedia) {
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsInitializing(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const error = err as Error;
        console.warn('Webcam initiation failed:', error);
        setCameraError(
          error.name === 'NotAllowedError'
            ? 'Camera permission was denied. You can upload a selfie from your photo library instead.'
            : error.message || 'Unable to access your camera.'
        );
        setIsInitializing(false);
      });

    return () => {
      active = false;
      stopTracks();
    };
  }, [stopTracks]);

  // Capture frame from video element onto canvas
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally for natural selfie feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopTracks();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Retake photo: clear preview and restart camera
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedBlob(null);
    setErrorMsg(null);
    startCamera();
  };

  // Fallback: upload selfie file from disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose an image file (JPEG, PNG, or WebP).');
      return;
    }

    setCapturedBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    stopTracks();
    setCameraError(null);
    setErrorMsg(null);
  };

  // Submit enrollment blob to backend
  const handleConfirmEnrollment = async () => {
    if (!capturedBlob) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await roomService.enrollFace(inviteCode, capturedBlob);
      stopTracks();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      onEnrolled(result);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(
        error.message ||
          'Face verification failed. Make sure your face is clearly visible, centered, and well-lit, then try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-white/[0.1] bg-[#14171d] p-6 shadow-2xl relative">
      {/* Header Info */}
      <div className="text-left mb-5">
        <h2 className="text-xl font-bold tracking-tight text-white">Find your photos</h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Align your face in the frame. We match this against the event roll so only your photos appear in your private gallery.
        </p>
      </div>

      {/* Optical Viewfinder Viewport */}
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black border border-white/[0.12] flex items-center justify-center">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Preview with Viewfinder Brackets */}
        {!previewUrl && !cameraError && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />

            {/* Viewfinder Corner Reticles */}
            <div className="viewfinder-reticle viewfinder-tl" />
            <div className="viewfinder-reticle viewfinder-tr" />
            <div className="viewfinder-reticle viewfinder-bl" />
            <div className="viewfinder-reticle viewfinder-br" />

            {/* Viewfinder Oval Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-40 h-52 rounded-[50%] border border-sky-400/40 flex items-center justify-center">
                <div className="focal-scan-line" />
                <span className="text-[11px] font-medium text-slate-200 bg-black/60 px-2.5 py-0.5 rounded border border-white/10">
                  Align face
                </span>
              </div>
            </div>
          </>
        )}

        {/* Snapshot Review Preview */}
        {previewUrl && (
          <div className="relative h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selfie snapshot"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-[#14171d]/90 border border-emerald-500/30 text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Photo ready</span>
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && !previewUrl && (
          <div className="p-6 text-center flex flex-col items-center">
            <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
            <p className="text-xs text-slate-300 mb-4 max-w-xs">{cameraError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a1e27] hover:bg-[#222834] border border-white/20 px-4 py-2 text-xs font-medium text-white transition-colors"
            >
              <Upload className="h-4 w-4" /> Upload selfie from device
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {isInitializing && !cameraError && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-xs text-slate-300">Opening camera...</span>
          </div>
        )}
      </div>

      {/* Error Message Toast */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex flex-col gap-2.5">
        {!previewUrl ? (
          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border border-white/[0.1] bg-[#1a1e27] py-2.5 text-xs font-medium text-slate-300 hover:bg-[#222834] transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isInitializing || !!cameraError}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff4d2d] py-2.5 text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              <span>Take photo</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1a1e27] py-2.5 text-xs font-medium text-slate-300 hover:bg-[#222834] transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmEnrollment}
              disabled={isSubmitting}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Matching face...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Use photo & open gallery</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Alternative upload option when camera is active */}
        {!previewUrl && !cameraError && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-slate-400 hover:text-white transition-colors py-1 inline-flex items-center justify-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Or choose existing selfie from device</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Privacy Guarantee Note */}
      <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-start gap-2.5 text-slate-400 text-xs leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-200 font-medium">Privacy guaranteed:</strong> Your selfie is used solely to locate your photos in this event room and is discarded immediately after matching. No biometric images are stored.
        </span>
      </div>
    </div>
  );
};
