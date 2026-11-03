-- ==============================================================================
-- SnapRoom Database Initialization
-- Self-contained script for docker-entrypoint-initdb.d or fresh local DB setup
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
    model_version VARCHAR(64) NOT NULL DEFAULT 'buffalo_l',
    similarity_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (similarity_threshold >= 0.0 AND similarity_threshold <= 1.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON rooms;
CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. room_members
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('LEADER', 'MEMBER', 'GUEST', 'UPLOADER')),
    active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_room_members_room_user UNIQUE (room_id, user_id)
);

DROP TRIGGER IF EXISTS trg_room_members_updated_at ON room_members;
CREATE TRIGGER trg_room_members_updated_at
    BEFORE UPDATE ON room_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. room_member_embeddings
CREATE TABLE IF NOT EXISTS room_member_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES room_members(id) ON DELETE CASCADE,
    embedding vector(512) NOT NULL,
    model_version VARCHAR(64) NOT NULL DEFAULT 'buffalo_l',
    consent_given_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_room_member_embeddings_member UNIQUE (member_id)
);

-- 5. upload_batches
CREATE TABLE IF NOT EXISTS upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    client_batch_id VARCHAR(128) NOT NULL,
    expected_count INTEGER NOT NULL DEFAULT 0 CHECK (expected_count >= 0),
    verified_count INTEGER NOT NULL DEFAULT 0 CHECK (verified_count >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'UPLOADING', 'READY', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_upload_batches_room_client_batch UNIQUE (room_id, client_batch_id)
);

DROP TRIGGER IF EXISTS trg_upload_batches_updated_at ON upload_batches;
CREATE TRIGGER trg_upload_batches_updated_at
    BEFORE UPDATE ON upload_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. photos
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    client_photo_id VARCHAR(128) NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    bytes BIGINT NOT NULL DEFAULT 0 CHECK (bytes >= 0),
    checksum_etag VARCHAR(128) NULL,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'AWAITING_UPLOAD' CHECK (processing_status IN (
        'AWAITING_UPLOAD', 'UPLOADED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'NO_MATCHES', 'FAILED'
    )),
    model_version VARCHAR(64) NULL DEFAULT 'buffalo_l',
    threshold_version NUMERIC(4,3) NULL DEFAULT 0.500 CHECK (threshold_version IS NULL OR (threshold_version >= 0.0 AND threshold_version <= 1.0)),
    error_code VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_photos_batch_client_photo UNIQUE (batch_id, client_photo_id),
    CONSTRAINT uq_photos_room_object_key UNIQUE (room_id, object_key),
    CONSTRAINT uq_photos_id_room UNIQUE (id, room_id)
);

DROP TRIGGER IF EXISTS trg_photos_updated_at ON photos;
CREATE TRIGGER trg_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. photo_faces
CREATE TABLE IF NOT EXISTS photo_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    face_index INTEGER NOT NULL CHECK (face_index >= 0),
    confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    bbox JSONB NOT NULL,
    embedding vector(512) NOT NULL,
    model_version VARCHAR(64) NOT NULL DEFAULT 'buffalo_l',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_photo_faces_photo_face_index UNIQUE (photo_id, face_index)
);

-- 8. photo_user_matches
CREATE TABLE IF NOT EXISTS photo_user_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL,
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    best_similarity NUMERIC(5,4) NOT NULL CHECK (best_similarity >= 0.0 AND best_similarity <= 1.0),
    model_version VARCHAR(64) NOT NULL DEFAULT 'buffalo_l',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_photo_user_matches_photo_user UNIQUE (photo_id, user_id),
    CONSTRAINT fk_photo_user_matches_photo_room FOREIGN KEY (photo_id, room_id) REFERENCES photos(id, room_id) ON DELETE CASCADE,
    CONSTRAINT fk_photo_user_matches_room_member FOREIGN KEY (room_id, user_id) REFERENCES room_members(room_id, user_id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_photo_user_matches_updated_at ON photo_user_matches;
CREATE TRIGGER trg_photo_user_matches_updated_at
    BEFORE UPDATE ON photo_user_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. photo_processing_jobs
CREATE TABLE IF NOT EXISTS photo_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    operation VARCHAR(64) NOT NULL DEFAULT 'EXTRACT_AND_MATCH',
    model_version VARCHAR(64) NOT NULL DEFAULT 'buffalo_l',
    status VARCHAR(32) NOT NULL DEFAULT 'READY' CHECK (status IN (
        'READY', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY'
    )),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    lease_until TIMESTAMPTZ NULL,
    worker_id VARCHAR(128) NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_photo_processing_jobs_photo_op_model UNIQUE (photo_id, operation, model_version)
);

DROP TRIGGER IF EXISTS trg_photo_processing_jobs_updated_at ON photo_processing_jobs;
CREATE TRIGGER trg_photo_processing_jobs_updated_at
    BEFORE UPDATE ON photo_processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. outbox_events
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(64) NOT NULL DEFAULT 'PHOTO',
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    delivery_state VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (delivery_state IN ('PENDING', 'DELIVERED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    delivered_at TIMESTAMPTZ NULL
);

-- 11. audit_events
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    room_id UUID NULL REFERENCES rooms(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_room_members_room_active ON room_members(room_id, active);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_member_embeddings_member_id ON room_member_embeddings(member_id);
CREATE INDEX IF NOT EXISTS idx_room_member_embeddings_active ON room_member_embeddings(member_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_photos_room_created_at ON photos(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_batch_status ON photos(batch_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_photo_user_matches_room_user_created ON photo_user_matches(room_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_user_matches_photo ON photo_user_matches(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_processing_jobs_ready ON photo_processing_jobs(available_at ASC, created_at ASC)
    WHERE status IN ('READY', 'RETRY');
CREATE INDEX IF NOT EXISTS idx_photo_processing_jobs_lease_watchdog ON photo_processing_jobs(lease_until)
    WHERE status = 'PROCESSING';
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending ON outbox_events(next_attempt_at ASC)
    WHERE delivery_state = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_audit_events_room_created ON audit_events(room_id, created_at DESC);
