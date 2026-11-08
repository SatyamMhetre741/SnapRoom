'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { roomService } from '../services/roomService';
import { EnrollmentResponse } from '../types';

interface WebcamEnrollProps {
  inviteCode: string;
  onEnrolled: (result: EnrollmentResponse) => void;
  onCancel?: () => void;
}

export const WebcamEnroll: React.FC<WebcamEnrollProps> = ({ inviteCode, onEnrolled, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported by this browser.');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (error) {
      const typed = error as DOMException;
      setCameraError(typed.name === 'NotAllowedError' ? 'Camera permission was denied. You can upload a selfie instead.' : typed.message || 'Unable to access your camera.');
    } finally {
      setIsInitializing(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    // This effect intentionally starts an external camera stream and updates UI from its async result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startCamera();
    return () => {
      stopCamera();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [startCamera, stopCamera]);

  const setPreview = (blob: Blob) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextUrl = URL.createObjectURL(blob);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    stopCamera();
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setErrorMsg('The camera is still starting. Please wait a moment and try again.');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && setPreview(blob), 'image/jpeg', 0.95);
  };

  const retake = () => {
    setPreviewUrl(null);
    setErrorMsg(null);
    void startCamera();
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    setPreview(file);
  };

  const confirm = async () => {
    if (!previewUrlRef.current) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch(previewUrlRef.current);
      onEnrolled(await roomService.enrollFace(inviteCode, await response.blob()));
    } catch (error) {
      setErrorMsg((error as Error).message || 'Face enrollment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-white/[0.1] bg-[#14171d] p-6 shadow-2xl">
      <div className="mb-5"><h2 className="text-xl font-bold text-white">Request access to your photos</h2><p className="text-xs text-slate-400 mt-1 leading-relaxed">Align your face in the frame. Your selfie is used only to create a face embedding and is not stored.</p></div>
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black border border-white/[0.12] flex items-center justify-center">
        <canvas ref={canvasRef} className="hidden" />
        {!previewUrl && !cameraError && <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />}
        {!previewUrl && !cameraError && <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="w-40 h-52 rounded-[50%] border-2 border-sky-400/50"><span className="relative top-1/2 left-1/2 -translate-x-1/2 inline-block whitespace-nowrap text-[11px] text-slate-200 bg-black/60 px-2 py-0.5 rounded">Align face</span></div></div>}
        {previewUrl && <img src={previewUrl} alt="Selfie snapshot" className="h-full w-full object-cover" />}
        {cameraError && !previewUrl && <div className="p-6 text-center"><AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" /><p className="text-xs text-slate-300 mb-4">{cameraError}</p><button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-[#1a1e27] border border-white/20 px-4 py-2 text-xs font-medium text-white"><Upload className="h-4 w-4" />Upload selfie</button></div>}
        {isInitializing && !cameraError && !previewUrl && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-slate-300">Opening camera...</div>}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={chooseFile} />
      {errorMsg && <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}
      <div className="mt-5 flex gap-2">
        {onCancel && <button onClick={onCancel} className="flex-1 rounded-lg border border-white/[0.1] bg-[#1a1e27] py-2.5 text-xs text-slate-300">Back</button>}
        {!previewUrl ? <button onClick={capture} disabled={isInitializing || !!cameraError} className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff4d2d] py-2.5 text-xs text-white disabled:opacity-50"><Camera className="h-4 w-4" />Capture selfie</button> : <><button onClick={retake} disabled={isSubmitting} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.1] py-2.5 text-xs text-slate-300"><RotateCcw className="h-4 w-4" />Retake</button><button onClick={confirm} disabled={isSubmitting} className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs text-white disabled:opacity-50">{isSubmitting ? 'Submitting...' : <><Check className="h-4 w-4" />Request access</>}</button></>}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Camera access ends when you leave this step.</div>
    </div>
  );
};
