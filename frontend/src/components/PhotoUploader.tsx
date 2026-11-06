'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileImage,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { uploadService } from '../services/uploadService';
import { UploadProgress } from '../types';

interface PhotoUploaderProps {
  roomId: string;
  onUploadSuccess: () => void;
  onClose?: () => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  roomId,
  onUploadSuccess,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progressList, setProgressList] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // Validate and accumulate files
  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validNewFiles: File[] = [];
    let invalidCount = 0;

    Array.from(fileList).forEach((file) => {
      const isValidType = ALLOWED_TYPES.includes(file.type);
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (isValidType && isValidSize) {
        const alreadyExists = selectedFiles.some(
          (f) => f.name === file.name && f.size === file.size
        );
        if (!alreadyExists) {
          validNewFiles.push(file);
        }
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      setErrorMessage(
        `${invalidCount} file(s) skipped. Files must be JPEG, PNG, or WebP under 25 MB.`
      );
    }

    if (validNewFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validNewFiles]);
    }
  };

  const removeFile = (index: number) => {
    if (isUploading) return;
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleAddFiles(e.dataTransfer.files);
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await uploadService.uploadBatch(roomId, selectedFiles, (items, overall) => {
        setProgressList(items);
        setOverallProgress(overall);
      });

      setSuccessMessage(
        `Uploaded ${selectedFiles.length} photo(s). Guests will see matches automatically.`
      );
      setSelectedFiles([]);
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Upload failed. Please check your internet connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-[#14171d] p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1e27] border border-white/[0.1] text-slate-200">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Upload event photos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bulk upload uncompressed camera shots for this event.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`mt-4 rounded-xl border border-dashed p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-[#ff4d2d] bg-[#ff4d2d]/5'
              : 'border-white/[0.15] bg-[#0b0c0e] hover:border-white/30'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1a1e27] text-slate-300 mb-3 border border-white/[0.08]">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-200">
            Drag photo files here, or <span className="text-[#ff7054] underline underline-offset-2">browse files</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            JPEG, PNG, or WebP up to 25 MB each. Select multiple files or entire folders.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleAddFiles(e.target.files)}
            disabled={isUploading}
          />
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Batch Progress */}
        {isUploading && (
          <div className="mt-4 p-4 rounded-xl bg-[#0b0c0e] border border-white/[0.08]">
            <div className="flex justify-between items-center text-xs font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ff7054]" />
                Uploading files...
              </span>
              <span className="font-mono text-slate-200">{overallProgress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#ff4d2d] transition-all duration-200"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Ready for upload ({selectedFiles.length} photos)</span>
              <span>{(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, idx) => {
                const progressItem = progressList[idx];
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0b0c0e] border border-white/[0.06] text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileImage className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-200 truncate font-medium">{file.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    {isUploading && progressItem ? (
                      <div className="w-24 pl-2 flex items-center gap-1.5">
                        <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-[#ff4d2d]"
                            style={{ width: `${progressItem.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-300">
                          {progressItem.progress}%
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => removeFile(idx)}
                        disabled={isUploading}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Files are transferred directly to cloud storage.
          </span>
          <div className="flex gap-2.5">
            {onClose && (
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-lg border border-white/[0.1] bg-[#1a1e27] text-xs font-medium text-slate-300 hover:bg-[#222834] transition-colors disabled:opacity-50"
              >
                Close
              </button>
            )}
            <button
              onClick={handleStartUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff4d2d] text-xs font-medium text-white hover:bg-[#e03e1e] transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading batch...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Start upload ({selectedFiles.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
