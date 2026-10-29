'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
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

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
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
        // Prevent duplicates by name and size
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
        `${invalidCount} file(s) were skipped (must be JPEG, PNG, or WebP under 15 MB).`
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
        `Successfully uploaded ${selectedFiles.length} photo(s)! AI facial indexing started in the background.`
      );
      setSelectedFiles([]);
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during photo batch upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#12141f] p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Upload Event Photos
                <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Direct S3/R2 Storage
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bulk upload high-res images. InsightFace AI routes each photo to attendees.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[0.99]'
              : 'border-white/15 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-white/[0.04]'
          } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 shadow-inner">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Drag and drop event photos here, or <span className="text-indigo-400">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports JPEG, PNG, and WebP (up to 15 MB per file). Multiple files supported.
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
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Overall Batch Progress */}
        {isUploading && (
          <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex justify-between items-center text-xs font-medium text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                Uploading directly to cloud storage...
              </span>
              <span className="font-mono text-indigo-400">{overallProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Ready for upload ({selectedFiles.length} files)</span>
              <span>{(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, idx) => {
                const progressItem = progressList[idx];
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileImage className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-200 truncate font-medium">{file.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    {isUploading && progressItem ? (
                      <div className="w-24 pl-2 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all duration-150"
                            style={{ width: `${progressItem.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-300">
                          {progressItem.progress}%
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => removeFile(idx)}
                        disabled={isUploading}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI face grouping runs immediately upon upload</span>
          </div>
          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Close
              </button>
            )}
            <button
              onClick={handleStartUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading Batch...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" /> Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
