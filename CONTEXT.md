# SendMyPics - System Context

This file is the source of truth for the end-to-end photo pipeline. Keep the specialized context files under `frontend/`, `backend/`, `ai-services/`, `db/`, `infra/`, and `docs/` consistent with it.

## Product model

SendMyPics is a room-scoped photo delivery system. A user joins a room, enrolls a face template, and later sees only room photos whose detected faces match that template. A room leader or permitted uploader sends photos; users never upload through the application server's request body.

The room is the security boundary. Every query, object key, job, and match must carry `room_id`, and the authenticated user must be authorized for that room before data or signed URLs are returned.

## Canonical architecture

```text
Browser -> Spring Boot API -> PostgreSQL
    |          |                 |
    |          +-> R2 presigned PUT (browser uploads bytes directly)
    |                            +-> outbox/job queue
    |                                  -> worker fetches private R2 object
    |                                  -> internal FastAPI AI service
    |                                  -> pgvector match + status update
    +<- API returns short-lived signed GET URLs for visible photos
```

Cloudflare R2 does not need to return a public URL after a PUT. The API creates a stable private `object_key`; the browser receives a presigned upload URL, uploads the bytes to R2, and calls the API to finalize the upload. The API stores the object key and metadata. A short-lived download URL is generated only when a user requests a gallery page or download. Never persist an expiring presigned URL as the photo's identity.

## Full pipeline and ordering

### 1. Room and identity

1. Authenticate or create the user.
2. `POST /rooms` creates a room and a membership with role `LEADER`.
3. A guest opens the invite link, authenticates or receives the permitted guest identity, and joins the room.
4. The guest submits one selfie to the backend. The backend sends it synchronously to the private AI service for one face embedding, validates exactly one acceptable face, stores only the normalized 512-dimensional embedding in `room_member_embeddings`, then discards the selfie bytes. Enrollment is complete only after the DB transaction commits.

### 2. Batch creation and direct R2 upload

1. The uploader calls `POST /rooms/{roomId}/upload-batches` with the file manifest: client id, original filename, content type, byte size, and checksum when available.
2. The backend authorizes the uploader, validates type/size/count, creates an `upload_batches` row, creates one `photos` row per accepted file with status `AWAITING_UPLOAD`, and generates a unique private R2 key such as `rooms/{roomId}/photos/{photoId}/original`.
3. The backend returns one presigned `PUT` URL per photo plus the `photoId`, `objectKey`, required content type, and expiration. The URL is an upload capability, not a value to store in Postgres.
4. The browser uploads each file directly to R2 with the exact content type. It tracks progress and retries only with a fresh presign if the URL expires.
5. After each successful PUT, the browser calls `POST /photos/{photoId}/complete-upload` with the object key, byte size, checksum/ETag, and upload attempt id. The backend verifies that the photo is owned by the batch, optionally performs an R2 `HEAD`, and changes the photo to `UPLOADED`.
6. When the batch is complete, the browser calls `POST /upload-batches/{batchId}/finalize`. The backend rechecks that every expected photo is uploaded, marks the batch `READY`, and inserts one durable processing job per photo through the outbox/queue transaction. Finalization is idempotent.

Do not enqueue AI work from the browser. Do not infer upload success merely from the presigned URL being issued. The durable event is the backend's verified `complete-upload` transition.

### 3. Durable asynchronous AI processing

The recommended first implementation uses a Postgres-backed job queue because Postgres is already required and it gives transactional enqueue, row locking, retries, and observable state. A later deployment can replace the delivery mechanism with Cloudflare Queues, SQS, or RabbitMQ without changing the photo state machine; the outbox remains the source of truth.

1. In one DB transaction, the backend updates a verified photo to `QUEUED` and inserts an `outbox_events` row/event or `photo_processing_jobs` row with a unique `(photo_id, operation, version)` key.
2. A worker claims jobs using `FOR UPDATE SKIP LOCKED`, sets `status = PROCESSING`, `lease_until`, `attempt_count`, and `worker_id`, then commits quickly. Never hold a DB transaction while calling R2 or AI.
3. The worker fetches the private object from R2 using the object key, validates the content type/size, and sends the image bytes as multipart to the internal FastAPI `/extract-faces` endpoint. The AI service does not access R2 or Postgres.
4. The AI service returns detected faces, confidence, bounding box, and normalized 512-D embeddings. It returns no user identity and persists nothing.
5. In a short DB transaction, the worker stores `photo_faces`, runs a room-filtered pgvector cosine search against active room member embeddings, upserts `photo_user_matches`, and marks the photo `PROCESSED` (or `NO_MATCHES` when valid processing found no match). The batch counters are updated in the same transaction.
6. On transient R2/AI/DB/network failures, the worker increments the attempt count and schedules exponential backoff. On permanent failures or exhausted attempts it marks the job and photo `FAILED`, stores a safe error code, and leaves the original object for retry/audit or later retention cleanup. A watchdog requeues expired leases.
7. The worker must be idempotent. Reprocessing the same photo version may replace face detections and must upsert matches, never create duplicate matches.

### 4. When photos become visible

`All Room Photos` may show a photo after `UPLOADED` because the object is present, the user is authorized for the room, and the API can issue a signed GET URL. The UI must label it as processing if it has not reached a terminal AI state.

`My Pics` must show a photo only after the match transaction commits and creates a `photo_user_matches` row for the authenticated user. The gallery query joins `photos` to matches and filters `photos.processing_status = PROCESSED` and `photo_user_matches.user_id = currentUser`; it never guesses from a client-side URL.

The frontend can poll `GET /upload-batches/{id}/status` or use SSE/WebSocket later. Polling every 3-5 seconds is sufficient for MVP. The API returns counts for `AWAITING_UPLOAD`, `QUEUED`, `PROCESSING`, `PROCESSED`, `NO_MATCHES`, and `FAILED`. When all photos are terminal, the UI stops polling and refreshes `My Pics`.

## State machines

Photo: `AWAITING_UPLOAD -> UPLOADED -> QUEUED -> PROCESSING -> PROCESSED | NO_MATCHES | FAILED`.

Allowed recovery transitions: `FAILED -> QUEUED` for an authorized retry, and `PROCESSING -> QUEUED` when a lease expires. Never move a photo to `PROCESSED` before its face/match transaction commits. A deleted or quarantined object cannot be processed.

Batch: `OPEN -> UPLOADING -> READY -> PROCESSING -> COMPLETED | COMPLETED_WITH_ERRORS | FAILED`.

## Required boundaries and invariants

- Store canonical identity as `room_id`, `photo_id`, and private `object_key`; do not store presigned GET URLs.
- The backend is the only service allowed to talk to R2 and Postgres. The AI service is internal-only and stateless.
- Every job has a unique idempotency key and a lease. A crashed worker must not strand a photo forever.
- Every match is unique on `(photo_id, user_id)` and stores the highest score observed for that photo version.
- Face embeddings are biometric data. Encrypt backups, restrict access, avoid logging vectors, keep audit events, and support room/user deletion. Raw enrollment selfies are discarded after extraction.
- Signed GET URLs should be short-lived and generated after authorization; never expose R2 credentials or a public bucket.
- Use a per-room threshold/configuration version so future model or threshold changes can reprocess deterministically.

## Service responsibilities

- `frontend/`: identity flow, room UI, batch manifest, direct R2 upload, upload completion, status polling, and gallery rendering.
- `backend/`: authentication/authorization, presigning, upload verification, transactions, outbox/job claiming, R2 access, AI orchestration, match queries, signed GET URLs, and downloads.
- `ai-services/`: stateless face detection/embedding extraction only.
- `db/`: migrations, constraints, indexes, queue queries, and retention policies.
- `infra/`: R2/private network configuration, Postgres, queue worker deployment, secrets, health checks, and monitoring.
- `docs/`: API contracts, sequence diagrams, operational runbooks, and data lifecycle documentation.

## Non-goals for the first version

Do not add public object URLs, client-controlled user ids, synchronous full-batch processing, a second database, or a separate message broker until load requires it. The durable DB queue plus outbox gives a reliable MVP and can be swapped behind the worker interface later.
