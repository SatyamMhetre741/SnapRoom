'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Upload,
  Sparkles,
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

    // Stop any existing tracks first
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
    } catch (err: any) {
      console.warn('Webcam initiation failed:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access or upload a selfie file below.'
          : err.message || 'Unable to access your camera.'
      );
    } finally {
      setIsInitializing(false);
    }
  }, [stream]);

  // Initialize camera on mount and ensure cleanup on unmount
  useEffect(() => {
    startCamera();

    return () => {
      // Crucial requirement: Stop all media tracks on unmount
      if (videoRef.current?.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []); // Run on mount

  // Capture frame from video element onto canvas
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the current video frame (mirroring horizontally to match natural selfie feel)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          // Pause and stop camera stream while reviewing capture
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
      // Ensure all camera streams are terminated
      stopTracks();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      onEnrolled(result);
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          'Face enrollment failed. Ensure your face is centered, well-lit, and visible, then retake.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border border-white/10 bg-[#12141f]/95 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5" /> 1-Second Biometric Setup
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Enroll Face Vector</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Take a quick selfie to automatically route and sort every event photo featuring your face.
        </p>
      </div>

      {/* Camera / Preview Viewport */}
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-inner flex items-center justify-center">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Preview */}
        {!previewUrl && !cameraError && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />

            {/* Biometric Face Oval Framing Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-44 h-60 rounded-[50%] border-2 border-dashed border-indigo-400/70 shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center">
                <div className="scan-line" />
                <div className="text-[11px] font-medium text-indigo-300 bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  Align Face Here
                </div>
              </div>
            </div>
          </>
        )}

        {/* Snapshot Review Preview */}
        {previewUrl && (
          <div className="relative h-full w-full">
            <img
              src={previewUrl}
              alt="Selfie snapshot"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
              <CheckCircle className="h-3 w-3" /> Snapshot Captured
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && !previewUrl && (
          <div className="p-6 text-center flex flex-col items-center">
            <AlertCircle className="h-10 w-10 text-amber-400 mb-2" />
            <p className="text-xs text-slate-300 mb-4">{cameraError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors"
            >
              <Upload className="h-4 w-4" /> Upload Selfie Photo
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
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
            <span className="text-xs text-slate-300">Warming up camera...</span>
          </div>
        )}
      </div>

      {/* Error Message Toast */}
      {errorMsg && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-2.5">
        {!previewUrl ? (
          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isInitializing || !!cameraError}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Camera className="h-4 w-4" /> Capture Selfie
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retake
            </button>
            <button
              type="button"
              onClick={handleConfirmEnrollment}
              disabled={isSubmitting}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Enrolling Face...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> Confirm & Enter Room
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
            className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors py-1 inline-flex items-center justify-center gap-1"
          >
            <Upload className="h-3 w-3" /> Or choose an existing selfie from device
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
      <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2 text-slate-400 text-[11px] leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300 font-medium">Privacy Guaranteed:</strong> Raw selfie
          images are processed in-memory to extract a 512-D face embedding and discarded
          immediately. Your raw photo is never stored.
        </span>
      </div>
    </div>
  );
};
