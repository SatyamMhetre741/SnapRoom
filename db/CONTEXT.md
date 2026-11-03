# Database Agent Context (`db/`)

PostgreSQL 16 + pgvector is the system of record. Use versioned migrations and explicit state constraints. UUIDs are preferred for public identifiers.

## Tables

1. `users`: identity and account timestamps.
2. `rooms`: name, invite code, leader, lifecycle, timestamps.
3. `room_members`: room/user/role, active state, joined timestamps, unique `(room_id,user_id)`.
4. `room_member_embeddings`: member id, normalized `vector(512)`, model version, consent/enrolled timestamps, revoked timestamp. Keep biometric data separate from membership so it can be deleted independently.
5. `upload_batches`: room, uploader, client batch id, expected/verified counts, state, timestamps, unique `(room_id, client_batch_id)`.
6. `photos`: room, batch, uploader, client photo id, object key, original filename, MIME, bytes, checksum/ETag, processing state, model/threshold version, error code, timestamps. Unique `(batch_id, client_photo_id)` and unique `(room_id, object_key)`.
7. `photo_faces`: photo, face index, confidence, bbox, embedding vector, model version. Unique `(photo_id, face_index)`; delete/rewrite for a new photo version.
8. `photo_user_matches`: photo, room, user, best similarity, embedding/model version, timestamps. Unique `(photo_id,user_id)` and FK to the same room. This is the table used for My Pics.
9. `photo_processing_jobs`: photo, operation, status, attempt count, available_at, lease_until, worker id, last error, completed timestamps. Unique `(photo_id, operation, model_version)`.
10. `outbox_events`: event id, aggregate/photo id, event type, JSON payload, delivery state, attempts, next attempt, timestamps. Unique event id; optional if jobs are inserted directly in the same transaction, but retain it if an external queue will be added.
11. `audit_events`: actor, room, action, target, safe metadata, timestamp; never store image bytes, tokens, signed URLs, or embeddings.

## Critical indexes and constraints

- `room_members(room_id, active)`;
- `room_member_embeddings(member_id)` and vector index only after measurement; filter by room first;
- `photos(room_id, created_at desc)` and `photos(batch_id, processing_status)`;
- `photo_user_matches(room_id, user_id, created_at desc)`;
- partial job index on `status IN ('READY','RETRY') AND available_at <= now()`;
- check constraints for nonnegative size, valid state values, and similarity range;
- foreign keys prevent cross-room matches and orphaned jobs.

For MVP rooms with hundreds of members, exact cosine search with `WHERE room_id = :roomId AND revoked_at IS NULL` is simpler. Add HNSW/IVFFlat only after measuring. Use `1 - (embedding <=> probe)` and a configurable threshold, defaulting to the product decision rather than hard-coding it in application code.

## Queue transaction

The finalize transaction must update the batch/photos and insert jobs/outbox records atomically. A worker claims with `FOR UPDATE SKIP LOCKED`, sets a lease, commits, then performs external work. A watchdog requeues expired `PROCESSING` jobs. Match upserts are idempotent and keep the greatest score.

## Retention

Define explicit retention for original objects, failed objects, face embeddings, matches, audit events, and signed URL lifetime. Room deletion must revoke access first, then delete matches/embeddings and enqueue private R2 deletion; do not rely on database deletion alone.
