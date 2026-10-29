# Frontend Agent Context (`frontend/`)

## 1. Tech Stack & Role
- **Framework:** React 18+ with Next.js (App Router) or Vite + TypeScript.
- **Styling:** Tailwind CSS + Lucide Icons.
- **Camera & Face Framing:** Native HTML5 `navigator.mediaDevices.getUserMedia` with `<video>` and `<canvas>` elements (optionally enhanced with `@mediapipe/tasks-vision` for live face bounding box feedback).
- **File Uploads:** Direct-to-S3/R2 `PUT` requests using `fetch` / `XMLHttpRequest` (or `@uppy/aws-s3`) via presigned URLs issued by Spring Boot.

## 2. Directory Responsibilities
- `src/components/` — Reusable UI components:
  - `WebcamEnroll.tsx`: Opens front camera (`1280x720`, `facingMode: "user"`), renders video preview, captures a frame to `<canvas>`, exports a `image/jpeg` Blob, and submits it to `POST /api/rooms/{inviteCode}/enroll`.
  - `PhotoUploader.tsx`: Drag-and-drop multi-file uploader for room leaders. Validates file type (`image/jpeg`, `image/png`, `image/webp`) and max size (`15 MB`). Requests presigned `PUT` URLs, uploads directly to storage, and calls `POST /api/rooms/{roomId}/process-photos` when the batch finishes.
  - `RoomGallery.tsx`: Renders a toggle between two tabs: **"For You (My Photos)"** (matched by face) and **"All Room Photos"**. Supports multi-select checkboxes and lightbox preview.
  - `ZipDownloadButton.tsx`: Triggers `POST /api/rooms/{roomId}/download-zip` with the selected `objectKey` and `fileName` list, streaming the response blob as a browser download.
- `src/app/` (or `src/pages/`) — Application screens and routes:
  - `/` — Landing page, login/register, and "Create Room" / "Join with Code" actions.
  - `/rooms/[inviteCode]/join` — Interstitial face enrollment gate before entering a room.
  - `/rooms/[roomId]` — Main room workspace (header with invite QR/link, upload trigger for `LEADER`, processing status banner, and `RoomGallery`).
- `src/services/` — Typed API clients:
  - `apiClient.ts`: Axios/Fetch wrapper attaching `Authorization: Bearer <jwt>` headers.
  - `roomService.ts`: Room CRUD, enrollment, gallery queries, and ZIP download calls.
  - `uploadService.ts`: Presigned URL orchestration and direct S3/R2 `PUT` progress tracking.
- `src/types/` — Shared TypeScript interfaces (`index.ts`):
  - `User`, `Room`, `RoomRole` (`'LEADER' | 'MEMBER'`), `PhotoStatus` (`'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'`).
  - `PhotoItem` (`id`, `objectKey`, `fileName`, `presignedGetUrl`, `similarityScore?`, `createdAt`).
  - `DownloadItemDto` (`objectKey: string`, `fileName: string`).
- `.env.local.example` — Template containing `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api`.

## 3. Frontend Implementation Rules
1. **Never Upload Raw Photos Through Spring Boot When Using Presigned Flow:** Request presigned `PUT` URLs from `/api/rooms/{roomId}/presign-upload` and upload binary blobs directly to the storage URL with the matching `Content-Type` header.
2. **Release Webcam Streams:** Always stop all media tracks (`stream.getTracks().forEach(t => t.stop())`) inside a cleanup effect immediately after selfie enrollment completes or the component unmounts.
3. **Graceful Async Polling:** Because `@Async` photo routing on CPU takes ~380 ms per detected face, show a non-blocking "Sorting photos in the background..." indicator and poll room status every 5 seconds until pending photos transition to `COMPLETED`.