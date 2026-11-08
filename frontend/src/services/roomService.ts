import { apiRequest, API_BASE_URL, getAuthToken } from './apiClient';
import {
  Room,
  EnrollmentResponse,
  PhotoItem,
  DownloadItemDto,
  RoomStatusResponse
  , MemberRequest
} from '../types';

export const roomService = {
  /**
   * Creates a new room. Current user becomes LEADER.
   * POST /api/rooms
   */
  async createRoom(name: string): Promise<Room> {
    return await apiRequest<Room>('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
  },

  /**
   * Retrieves room details by ID.
   * GET /api/rooms/{roomId}
   */
  async getRoom(roomId: string): Promise<Room> {
    return apiRequest<Room>(`/rooms/${roomId}`);
  },

  /**
   * Resolves room info by invite code for enrollment preview.
   * GET /api/rooms/invite/{inviteCode} or fallback
   */
  async getRoomByInviteCode(inviteCode: string): Promise<Room> {
    return apiRequest<Room>(`/rooms/invite/${inviteCode}`);
  },

  /**
   * Enrolls a webcam selfie frame into the room.
   * POST /api/rooms/{inviteCode}/enroll
   * Sends multipart form data with image file part named 'selfie'
   */
  async enrollFace(inviteCode: string, selfieBlob: Blob): Promise<EnrollmentResponse> {
    const formData = new FormData();
    formData.append('selfie', selfieBlob, 'selfie.jpg');

    return apiRequest<EnrollmentResponse>(`/rooms/${inviteCode}/enroll`, {
        method: 'POST',
        body: formData,
      });
  },

  /**
   * Fetches photos matched to the authenticated user's face.
   * GET /api/rooms/{roomId}/photos/me
   */
  async getMyPhotos(roomId: string): Promise<PhotoItem[]> {
    return apiRequest<PhotoItem[]>(`/rooms/${roomId}/photos/me`);
  },

  /**
   * Fetches all event photos for the room.
   * GET /api/rooms/{roomId}/photos
   */
  async getAllPhotos(roomId: string): Promise<PhotoItem[]> {
    return apiRequest<PhotoItem[]>(`/rooms/${roomId}/photos`);
  },

  /**
   * Polls processing status of photos in the room.
   * GET /api/rooms/{roomId}/status
   */
  async getRoomStatus(roomId: string): Promise<RoomStatusResponse> {
    return apiRequest<RoomStatusResponse>(`/rooms/${roomId}/status`);
  },

  /**
   * Triggers background photo processing after upload.
   * POST /api/rooms/{roomId}/process-photos
   */
  async processPhotos(roomId: string, objectKeys: string[]): Promise<void> {
    await apiRequest<void>(`/rooms/${roomId}/process-photos`, {
        method: 'POST',
        body: JSON.stringify({ objectKeys }),
      });
  },

  async getJoinRequests(roomId: string): Promise<MemberRequest[]> {
    return apiRequest<MemberRequest[]>(`/rooms/${roomId}/join-requests`);
  },

  async approveJoinRequest(roomId: string, memberId: string): Promise<void> {
    await apiRequest<void>(`/rooms/${roomId}/join-requests/${memberId}/approve`, { method: 'POST' });
  },

  async rejectJoinRequest(roomId: string, memberId: string): Promise<void> {
    await apiRequest<void>(`/rooms/${roomId}/join-requests/${memberId}/reject`, { method: 'POST' });
  },

  /**
   * Downloads selected photos as a streaming .zip archive.
   * POST /api/rooms/{roomId}/download-zip
   */
  async downloadZip(roomId: string, items: DownloadItemDto[]): Promise<Blob> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/download-zip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) throw new Error(`Failed to generate ZIP archive: HTTP ${response.status}`);
    return response.blob();
  },

  getAllLocalRooms,
};

function getAllLocalRooms(): Room[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('snaproom_local_rooms');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/* Demo photo fixtures intentionally removed: production UI must never hide API/storage failures. */
/* function getDemoPhotos(roomId: string): PhotoItem[] {
  return [
    {
      id: 'p1',
      roomId,
      objectKey: `rooms/${roomId}/photo-stage-01.jpg`,
      fileName: 'Stage_Cheers.jpg',
      status: 'COMPLETED',
      presignedGetUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      similarityScore: 0.94,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'p2',
      roomId,
      objectKey: `rooms/${roomId}/photo-group-02.jpg`,
      fileName: 'Team_Celebration.jpg',
      status: 'COMPLETED',
      presignedGetUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
      similarityScore: 0.88,
      createdAt: new Date(Date.now() - 3000000).toISOString(),
    },
    {
      id: 'p3',
      roomId,
      objectKey: `rooms/${roomId}/photo-table-03.jpg`,
      fileName: 'Dinner_Table_Laughs.jpg',
      status: 'COMPLETED',
      presignedGetUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
      similarityScore: 0.79,
      createdAt: new Date(Date.now() - 2400000).toISOString(),
    },
    {
      id: 'p4',
      roomId,
      objectKey: `rooms/${roomId}/photo-sunset-04.jpg`,
      fileName: 'Rooftop_Sunset.jpg',
      status: 'COMPLETED',
      presignedGetUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      similarityScore: 0.91,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'p5',
      roomId,
      objectKey: `rooms/${roomId}/photo-venue-05.jpg`,
      fileName: 'Venue_Illumination.jpg',
      status: 'COMPLETED',
      presignedGetUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
      similarityScore: 0.32, // All photos tab only
      createdAt: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: 'p6',
      roomId,
      objectKey: `rooms/${roomId}/photo-crowd-06.jpg`,
      fileName: 'Concert_Crowd.jpg',
      status: 'COMPLETED',
      presignedGetUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      similarityScore: 0.25,
      createdAt: new Date(Date.now() - 600000).toISOString(),
    },
  ];
} */
