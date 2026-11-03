# Frontend Agent Context (`frontend/`)

## Role

Next.js/React + TypeScript is responsible for room UX and upload orchestration. It never sends photo bytes through Spring Boot and never calls the AI service.

## Upload flow

1. The uploader selects files. Validate image MIME, extension, size, count, and reject unsafe names; compute a client id and optionally a checksum.
2. Call `POST /api/rooms/{roomId}/upload-batches` with a manifest. Render the returned batch and photo ids.
3. For each returned presigned R2 `PUT` URL, upload directly with the exact `Content-Type`; use bounded concurrency (3-5), progress, cancellation, and retry.
4. After a 2xx PUT, call `POST /api/photos/{photoId}/complete-upload`. A PUT alone is not a completed application upload.
5. Call `POST /api/upload-batches/{batchId}/finalize`. Show counts from the response and poll `GET /api/upload-batches/{batchId}/status` every 3-5 seconds.

The client treats photo ids/object keys as opaque. It never persists or reuses an expired signed URL and never assumes the R2 ETag is a public URL.

## Gallery behavior

`All Room Photos` can render verified uploaded photos with a processing badge. `My Pics` renders only API results containing a backend-authorized short-lived `downloadUrl`; it is not built by filtering the all-photos response in the browser. Refresh the gallery after a batch reaches a terminal state. Handle 403/404 signed URL failures by refetching the page.

## Required screens/components

- room creation/join and face enrollment gate;
- `PhotoUploader` with manifest -> presign -> PUT -> complete -> finalize states;
- batch progress panel showing counts and failed items;
- `RoomGallery` with `All Photos` and `My Pics` tabs;
- processing/empty/error states and a retry action for failed photos;
- signed-URL-aware lightbox and download controls.

Stop webcam tracks on completion/unmount. Do not log selfies, image bytes, access tokens, presigned URLs, or embeddings.

## API types

Model `UploadBatch`, `UploadPhoto`, `PhotoProcessingStatus`, `GalleryPhoto`, `RoomMember`, and terminal states explicitly. The upload state machine is `AWAITING_UPLOAD`, `UPLOADED`, `QUEUED`, `PROCESSING`, `PROCESSED`, `NO_MATCHES`, `FAILED`; batch states are defined in the root context.
