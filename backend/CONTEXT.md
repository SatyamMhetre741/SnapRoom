# Backend Agent Context (`backend/`)

## Role

Java 21 + Spring Boot 3.x owns authorization, transactions, R2 access, the internal AI call, the durable queue worker, and all gallery/download responses.

## Request ordering

- `POST /api/rooms/{roomId}/upload-batches`: authorize uploader; create `upload_batches` and `photos` in `AWAITING_UPLOAD`; return presigned PUT URLs and opaque object keys.
- `POST /api/photos/{photoId}/complete-upload`: authorize batch owner; verify object key and optionally R2 HEAD/checksum; transition to `UPLOADED` idempotently.
- `POST /api/upload-batches/{batchId}/finalize`: lock batch, verify all expected uploads, transition photos to `QUEUED`, insert unique processing jobs/outbox events, commit, return `202`.
- Worker: claim one job with `FOR UPDATE SKIP LOCKED`; commit lease; fetch R2; call AI; commit detections/matches/status in a separate short transaction.
- `GET /api/upload-batches/{batchId}/status`: return authoritative counts and failed item codes.
- `GET /api/rooms/{roomId}/photos`: authorized all-room gallery; issue short-lived signed GET URLs for uploaded/terminal photos.
- `GET /api/rooms/{roomId}/photos/me`: authorized My Pics query joining `photo_user_matches`; only return matches whose photo processing transaction committed.

## Components

Use separate services/classes for `UploadBatchService`, `StorageService`, `PhotoProcessingJobService`, `PhotoWorker`, `AiClient`, `PhotoMatchService`, and `GalleryService`. Spring `@Async` alone is not the durable queue: a process restart would lose in-memory work. If a local executor is used to poll Postgres jobs, it is only a delivery mechanism around durable rows.

The worker must not hold a DB transaction while fetching R2 or calling AI. Claim/lease, external work, and final persistence are separate phases. Use a watchdog for expired leases and exponential backoff for retryable failures.

## R2 rules

Use AWS SDK v2 `S3Presigner` for private presigned PUT/GET URLs. Persist `bucket`, `object_key`, content type, size, checksum/ETag, and upload timestamps. Do not persist a presigned URL; it expires. Use an object key scoped by room and photo id. The backend, not the browser, fetches the source object for AI.

## AI rules

POST the fetched bytes as multipart to internal FastAPI `/extract-faces`; include a filename. Validate response shape, model version, face confidence, and 512-D normalized vectors. Restrict matching by room id and active memberships. Do not send user ids to AI.

## Transaction and idempotency rules

- Unique keys: batch client id, photo `(batch_id, client_photo_id)`, job `(photo_id, operation, model_version)`, and match `(photo_id, user_id)`.
- `complete-upload`, `finalize`, job retry, and match writes are safe to repeat.
- Match upsert keeps the highest score for the same photo version.
- Map failures to safe error codes; never return stack traces, vectors, R2 credentials, or internal URLs.
- Enforce room membership/role on every endpoint, including signed URL generation and retry.

## Avoid

Do not rely on `@Async` self-invocation, do not process the whole batch in an HTTP request, do not make R2 public, and do not query My Pics from a client-supplied username or room id without authorization.
