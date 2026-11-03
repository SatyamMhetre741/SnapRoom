-- ==============================================================================
-- SnapRoom Production Database Queries
-- Reference implementations for Spring Boot / Worker / Watchdog
-- Complies with: db/CONTEXT.md, backend/CONTEXT.md, root CONTEXT.md
-- ==============================================================================

-- ==============================================================================
-- 1. QUEUE WORKER TRANSACTIONS
-- ==============================================================================

-- 1.1 Worker Claim Query
-- Atomically claims one ready or retryable job using row-level locking
-- Workers commit this transaction immediately to release DB lock before R2/AI operations
-- Parameters:
--   :workerId VARCHAR (e.g. 'worker-node-1-pid-4523')
--   :leaseDuration INTERVAL (e.g. interval '60 seconds')
WITH candidate AS (
    SELECT id
    FROM photo_processing_jobs
    WHERE status IN ('READY', 'RETRY')
      AND available_at <= clock_timestamp()
    ORDER BY available_at ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
UPDATE photo_processing_jobs j
SET status = 'PROCESSING',
    lease_until = clock_timestamp() + :leaseDuration,
    attempt_count = attempt_count + 1,
    worker_id = :workerId,
    updated_at = clock_timestamp()
FROM candidate
WHERE j.id = candidate.id
RETURNING j.id, j.photo_id, j.operation, j.model_version, j.attempt_count;

-- 1.2 Worker Heartbeat / Lease Extension
-- Called during longer AI operations to prevent watchdog timeouts
-- Parameters:
--   :jobId UUID
--   :workerId VARCHAR
--   :extension INTERVAL (e.g. interval '30 seconds')
UPDATE photo_processing_jobs
SET lease_until = clock_timestamp() + :extension,
    updated_at = clock_timestamp()
WHERE id = :jobId
  AND worker_id = :workerId
  AND status = 'PROCESSING';

-- 1.3 Worker Job Success Completion
-- Transition job to COMPLETED and update photo status to PROCESSED (or NO_MATCHES)
-- Parameters:
--   :jobId UUID
--   :photoId UUID
--   :finalPhotoStatus VARCHAR ('PROCESSED' or 'NO_MATCHES')
UPDATE photo_processing_jobs
SET status = 'COMPLETED',
    lease_until = NULL,
    completed_at = clock_timestamp(),
    updated_at = clock_timestamp()
WHERE id = :jobId;

UPDATE photos
SET processing_status = :finalPhotoStatus,
    updated_at = clock_timestamp()
WHERE id = :photoId;

-- 1.4 Worker Job Failure with Exponential Backoff
-- If attempts exhausted, mark FAILED; otherwise schedule RETRY
-- Parameters:
--   :jobId UUID
--   :photoId UUID
--   :errorCode VARCHAR
--   :errorMessage TEXT
--   :backoffSeconds INTEGER (e.g. 10 * 2^attempt_count)
UPDATE photo_processing_jobs
SET status = CASE 
        WHEN attempt_count >= max_attempts THEN 'FAILED' 
        ELSE 'RETRY' 
    END,
    available_at = CASE 
        WHEN attempt_count >= max_attempts THEN available_at 
        ELSE clock_timestamp() + (:backoffSeconds || ' seconds')::interval 
    END,
    lease_until = NULL,
    last_error = :errorMessage,
    updated_at = clock_timestamp()
WHERE id = :jobId;

UPDATE photos
SET processing_status = CASE 
        WHEN (SELECT attempt_count >= max_attempts FROM photo_processing_jobs WHERE id = :jobId) THEN 'FAILED'
        ELSE processing_status
    END,
    error_code = :errorCode,
    updated_at = clock_timestamp()
WHERE id = :photoId;

-- 1.5 Watchdog: Reclaim Expired Leases
-- Runs periodically to detect crashed workers and requeue stranded jobs
-- Parameters:
--   :recoveryDelay INTERVAL (e.g. interval '5 seconds')
UPDATE photo_processing_jobs
SET status = CASE 
        WHEN attempt_count >= max_attempts THEN 'FAILED' 
        ELSE 'RETRY' 
    END,
    lease_until = NULL,
    worker_id = NULL,
    available_at = clock_timestamp() + :recoveryDelay,
    last_error = 'Watchdog lease expired while in PROCESSING status',
    updated_at = clock_timestamp()
WHERE status = 'PROCESSING'
  AND lease_until < clock_timestamp();

-- ==============================================================================
-- 2. PGVECTOR FACE MATCHING (ROOM-SCOPED)
-- ==============================================================================

-- 2.1 Room-Scoped Cosine Similarity Search
-- Computes exact cosine similarity: 1 - (embedding <=> probe)
-- Enforces room security boundary, active membership, and non-revoked biometric consent
-- Parameters:
--   :roomId UUID
--   :probeEmbedding vector(512)
--   :threshold NUMERIC (e.g. 0.500)
SELECT 
    rm.user_id,
    rm.room_id,
    1 - (rme.embedding <=> :probeEmbedding) AS similarity_score,
    rme.model_version
FROM room_member_embeddings rme
JOIN room_members rm ON rm.id = rme.member_id
WHERE rm.room_id = :roomId
  AND rm.active = true
  AND rme.revoked_at IS NULL
  AND (1 - (rme.embedding <=> :probeEmbedding)) >= :threshold
ORDER BY similarity_score DESC;

-- 2.2 Idempotent Match Upsert
-- Upserts match result; keeps the greatest observed similarity score for the photo version
-- Parameters:
--   :photoId UUID
--   :roomId UUID
--   :userId UUID
--   :similarity NUMERIC
--   :modelVersion VARCHAR
INSERT INTO photo_user_matches (
    photo_id,
    room_id,
    user_id,
    best_similarity,
    model_version,
    created_at,
    updated_at
)
VALUES (
    :photoId,
    :roomId,
    :userId,
    :similarity,
    :modelVersion,
    clock_timestamp(),
    clock_timestamp()
)
ON CONFLICT (photo_id, user_id)
DO UPDATE SET
    best_similarity = GREATEST(photo_user_matches.best_similarity, EXCLUDED.best_similarity),
    model_version = EXCLUDED.model_version,
    updated_at = clock_timestamp();

-- 2.3 Record Detected Faces
-- Stores bounding boxes and facial vectors for audit or re-matching
-- Parameters:
--   :photoId UUID
--   :faceIndex INTEGER
--   :confidence NUMERIC
--   :bbox JSONB
--   :embedding vector(512)
--   :modelVersion VARCHAR
INSERT INTO photo_faces (
    photo_id,
    face_index,
    confidence,
    bbox,
    embedding,
    model_version,
    created_at
)
VALUES (
    :photoId,
    :faceIndex,
    :confidence,
    :bbox,
    :embedding,
    :modelVersion,
    clock_timestamp()
)
ON CONFLICT (photo_id, face_index)
DO UPDATE SET
    confidence = EXCLUDED.confidence,
    bbox = EXCLUDED.bbox,
    embedding = EXCLUDED.embedding,
    model_version = EXCLUDED.model_version;

-- ==============================================================================
-- 3. BATCH & UPLOAD LIFECYCLE TRANSACTIONS
-- ==============================================================================

-- 3.1 Verify & Complete Single Photo Upload
-- Called by backend upon receiving complete-upload callback
-- Parameters:
--   :photoId UUID
--   :batchId UUID
--   :objectKey VARCHAR
--   :bytes BIGINT
--   :checksumEtag VARCHAR
UPDATE photos
SET processing_status = 'UPLOADED',
    bytes = :bytes,
    checksum_etag = :checksumEtag,
    updated_at = clock_timestamp()
WHERE id = :photoId
  AND batch_id = :batchId
  AND object_key = :objectKey
  AND processing_status = 'AWAITING_UPLOAD';

-- 3.2 Finalize Batch Transaction (Step 1: Check Readiness)
-- Verifies that all expected photos have reached UPLOADED status
-- Parameters:
--   :batchId UUID
SELECT 
    b.id,
    b.room_id,
    b.expected_count,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'UPLOADED') AS uploaded_count,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'AWAITING_UPLOAD') AS pending_count
FROM upload_batches b
LEFT JOIN photos p ON p.batch_id = b.id
WHERE b.id = :batchId
GROUP BY b.id, b.room_id, b.expected_count;

-- 3.3 Finalize Batch Transaction (Step 2: Transition Batch & Photos)
-- Executed inside a single DB transaction
-- Parameters:
--   :batchId UUID
--   :modelVersion VARCHAR
UPDATE upload_batches
SET status = 'PROCESSING',
    verified_count = (SELECT COUNT(*) FROM photos WHERE batch_id = :batchId AND processing_status = 'UPLOADED'),
    updated_at = clock_timestamp()
WHERE id = :batchId;

UPDATE photos
SET processing_status = 'QUEUED',
    updated_at = clock_timestamp()
WHERE batch_id = :batchId
  AND processing_status = 'UPLOADED';

-- 3.4 Enqueue Processing Jobs for Queued Photos
INSERT INTO photo_processing_jobs (
    photo_id,
    operation,
    model_version,
    status,
    attempt_count,
    max_attempts,
    available_at
)
SELECT 
    id,
    'EXTRACT_AND_MATCH',
    :modelVersion,
    'READY',
    0,
    3,
    clock_timestamp()
FROM photos
WHERE batch_id = :batchId
  AND processing_status = 'QUEUED'
ON CONFLICT (photo_id, operation, model_version) DO NOTHING;

-- 3.5 Enqueue Outbox Event
INSERT INTO outbox_events (
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    delivery_state,
    attempts,
    next_attempt_at
)
VALUES (
    'UPLOAD_BATCH',
    :batchId,
    'BATCH_FINALIZED',
    json_build_object('batchId', :batchId, 'enqueuedAt', clock_timestamp()),
    'PENDING',
    0,
    clock_timestamp()
);

-- ==============================================================================
-- 4. GALLERY & STATUS QUERIES
-- ==============================================================================

-- 4.1 "My Pics" Query
-- Returns photos where detected face matched the authenticated user
-- Only visible when photo processing transaction committed (PROCESSED)
-- Parameters:
--   :roomId UUID
--   :userId UUID
--   :limit INTEGER
--   :offset INTEGER
SELECT 
    p.id AS photo_id,
    p.room_id,
    p.object_key,
    p.original_filename,
    p.mime_type,
    p.bytes,
    p.created_at,
    m.best_similarity,
    m.updated_at AS matched_at
FROM photo_user_matches m
JOIN photos p ON p.id = m.photo_id
WHERE m.room_id = :roomId
  AND m.user_id = :userId
  AND p.processing_status = 'PROCESSED'
ORDER BY p.created_at DESC
LIMIT :limit OFFSET :offset;

-- 4.2 "All Room Photos" Query
-- Returns photos visible to authorized room members
-- Shows photos that are uploaded or terminal; excludes failed uploads
-- Parameters:
--   :roomId UUID
--   :limit INTEGER
--   :offset INTEGER
SELECT 
    p.id AS photo_id,
    p.room_id,
    p.uploader_id,
    u.name AS uploader_name,
    p.object_key,
    p.original_filename,
    p.mime_type,
    p.bytes,
    p.processing_status,
    p.created_at
FROM photos p
JOIN users u ON u.id = p.uploader_id
WHERE p.room_id = :roomId
  AND p.processing_status NOT IN ('AWAITING_UPLOAD', 'FAILED')
ORDER BY p.created_at DESC
LIMIT :limit OFFSET :offset;

-- 4.3 Batch Status Aggregation
-- Polled by frontend to render upload & processing progress bars
-- Parameters:
--   :batchId UUID
SELECT 
    b.id AS batch_id,
    b.status AS batch_status,
    b.expected_count,
    b.verified_count,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'AWAITING_UPLOAD') AS count_awaiting_upload,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'UPLOADED') AS count_uploaded,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'QUEUED') AS count_queued,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'PROCESSING') AS count_processing,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'PROCESSED') AS count_processed,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'NO_MATCHES') AS count_no_matches,
    COUNT(p.id) FILTER (WHERE p.processing_status = 'FAILED') AS count_failed
FROM upload_batches b
LEFT JOIN photos p ON p.batch_id = b.id
WHERE b.id = :batchId
GROUP BY b.id, b.status, b.expected_count, b.verified_count;

-- ==============================================================================
-- 5. PRIVACY, BIOMETRIC CONSENT & RETENTION
-- ==============================================================================

-- 5.1 Revoke Biometric Consent
-- Immediately marks member embedding as revoked so future queries skip it
-- Parameters:
--   :memberId UUID
UPDATE room_member_embeddings
SET revoked_at = clock_timestamp()
WHERE member_id = :memberId;

-- 5.2 Delete Biometric Data on Member Leave
-- Physically removes vector embedding from DB when user leaves room
-- Parameters:
--   :memberId UUID
DELETE FROM room_member_embeddings
WHERE member_id = :memberId;

-- 5.3 Room Deletion Sequence (Revoke -> Purge Biometrics -> Mark Deleted)
-- Parameters:
--   :roomId UUID
-- Step 1: Deactivate room & members
UPDATE rooms 
SET status = 'DELETED', 
    updated_at = clock_timestamp() 
WHERE id = :roomId;

UPDATE room_members 
SET active = false, 
    updated_at = clock_timestamp() 
WHERE room_id = :roomId;

-- Step 2: Delete biometric vectors immediately
DELETE FROM room_member_embeddings
WHERE member_id IN (SELECT id FROM room_members WHERE room_id = :roomId);

-- Step 3: Delete user matches
DELETE FROM photo_user_matches
WHERE room_id = :roomId;

-- Step 4: Record audit trail (never logging raw vectors or keys)
INSERT INTO audit_events (
    actor_id,
    room_id,
    action,
    target_type,
    target_id,
    metadata
)
VALUES (
    :actorId,
    :roomId,
    'ROOM_DELETED',
    'ROOM',
    :roomId,
    json_build_object('retentionAction', 'BIOMETRICS_PURGED')
);
