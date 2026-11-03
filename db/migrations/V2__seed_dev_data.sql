-- ==============================================================================
-- Migration: V2__seed_dev_data.sql
-- Description: Sample development/testing seed data for SnapRoom
-- ==============================================================================

-- 1. Insert Test Users
INSERT INTO users (id, email, name, avatar_url)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'alice.host@snaproom.local', 'Alice Leader', 'https://avatar.iran.liara.run/public/1'),
    ('22222222-2222-2222-2222-222222222222', 'bob.guest@snaproom.local', 'Bob Guest', 'https://avatar.iran.liara.run/public/2')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Test Room
INSERT INTO rooms (id, name, invite_code, leader_id, status, model_version, similarity_threshold)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Summer Wedding 2026',
    'WEDDING26',
    '11111111-1111-1111-1111-111111111111',
    'ACTIVE',
    'buffalo_l',
    0.500
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Room Memberships
INSERT INTO room_members (id, room_id, user_id, role, active)
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'LEADER', true),
    ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'MEMBER', true)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- 4. Insert Biometric Enrollment for Bob (512-dimension unit vector)
-- Normalized unit vector where index 0 is 1.0 and rest 511 dimensions are 0.0
INSERT INTO room_member_embeddings (id, member_id, embedding, model_version, consent_given_at, enrolled_at)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    ('[' || '1.0' || repeat(',0.0', 511) || ']')::vector,
    'buffalo_l',
    clock_timestamp(),
    clock_timestamp()
)
ON CONFLICT (member_id) DO NOTHING;

-- 5. Insert Sample Upload Batch
INSERT INTO upload_batches (id, room_id, uploader_id, client_batch_id, expected_count, verified_count, status)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'batch_initial_ceremony_001',
    1,
    1,
    'READY'
)
ON CONFLICT (room_id, client_batch_id) DO NOTHING;

-- 6. Insert Sample Photo
INSERT INTO photos (
    id, room_id, batch_id, uploader_id, client_photo_id,
    object_key, original_filename, mime_type, bytes,
    processing_status, model_version, threshold_version
)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'photo_001',
    'rooms/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/photos/cccccccc-cccc-cccc-cccc-cccccccccccc/original.jpg',
    'ceremony_entrance.jpg',
    'image/jpeg',
    2048576,
    'QUEUED',
    'buffalo_l',
    0.500
)
ON CONFLICT (batch_id, client_photo_id) DO NOTHING;

-- 7. Insert Initial Photo Processing Job
INSERT INTO photo_processing_jobs (
    id, photo_id, operation, model_version, status, attempt_count, max_attempts, available_at
)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'EXTRACT_AND_MATCH',
    'buffalo_l',
    'READY',
    0,
    3,
    clock_timestamp()
)
ON CONFLICT (photo_id, operation, model_version) DO NOTHING;
