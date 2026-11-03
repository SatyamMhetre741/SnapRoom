# Documentation Agent Context (`docs/`)

Documentation must describe the durable pipeline, not an in-memory `@Async` shortcut.

Maintain:

- `architecture.md`: component diagram and sequence diagrams for enrollment, batch upload, upload completion/finalization, worker -> R2 -> AI -> Postgres processing, My Pics visibility, and retry/lease recovery;
- `api-endpoints.md`: authenticated REST contracts for batch creation, presigns, completion, finalization, status, all-room gallery, My Pics, retry, and internal AI; document `202 Accepted`, idempotency keys, state transitions, and signed URL expiry;
- `database.md`: tables, foreign keys, indexes, queue claim query, match upsert, retention, and biometric-data handling;
- `operations.md`: worker deployment, queue depth/lease monitoring, replay, R2 cleanup, model versioning, and incident recovery;
- `setup.md`: local Postgres/pgvector, private/local S3-compatible storage, backend, worker, AI readiness, and frontend setup.

The key user-facing rule must be documented prominently: a photo is available in `All Photos` after verified upload; it is available in `My Pics` only after the processing transaction creates the authenticated user's `photo_user_matches` row. Never document an expiring presigned URL as a stored photo URL; document `object_key` as the stable identity and signed GET URL generation as a read-time operation.
