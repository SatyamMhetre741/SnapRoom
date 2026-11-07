export type RoomRole = 'LEADER' | 'MEMBER';

export type PhotoStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  leaderId: string;
  createdAt?: string;
  memberCount?: number;
  photoCount?: number;
  userRole?: RoomRole;
}

export interface PhotoItem {
  id: string;
  roomId: string;
  uploaderId?: string;
  objectKey: string;
  fileName: string;
  status: PhotoStatus;
  presignedGetUrl?: string;
  similarityScore?: number;
  createdAt: string;
}

export interface DownloadItemDto {
  objectKey: string;
  fileName: string;
}

export interface PresignUploadItemRequest {
  fileName: string;
  contentType: string;
}

export interface PresignUploadItemResponse {
  objectKey: string;
  uploadUrl: string;
  fileName: string;
}

export interface EnrollmentResponse {
  memberId: string;
  roomId: string;
  role: RoomRole;
  enrolledAt: string;
  message?: string;
}

export interface RoomStatusResponse {
  totalPhotos: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  isProcessing: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadProgress {
  fileName: string;
  fileSize: number;
  progress: number; // 0 - 100
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}
