# SnapRoom Database (`db/`)

This directory houses the PostgreSQL 16 + pgvector schema, database migrations, initialization scripts, and operational query templates for SnapRoom.

PostgreSQL is the authoritative system of record for SnapRoom, serving both as the relational data store and as a durable, transaction-safe background job queue.

---

## 📁 Directory Structure

```
db/
├── CONTEXT.md                    # Database architectural context & invariants
├── init.sql                      # Idempotent standalone initialization script (for Docker / local)
├── queries.sql                   # Reference SQL queries (worker claiming, cosine search, gallery)
├── README.md                     # Database documentation & operational guide
└── migrations/
    ├── V1__initial_schema.sql    # Versioned migration: 11 core tables, indexes, constraints
    └── V2__seed_dev_data.sql     # Seed data for local testing (mock users, room, 512-D vectors)
```

---

## 🗄️ Relational Schema & Tables

All public identifiers use UUIDv4 (`gen_random_uuid()`). The database consists of 11 core tables structured around the room security boundary:

| Table | Purpose | Key Constraints |
|---|---|---|
| `users` | User identity and account metadata | `email UNIQUE` |
| `rooms` | Event rooms, invite codes, and AI model configurations | `invite_code UNIQUE`, `status IN ('ACTIVE','ARCHIVED','DELETED')` |
| `room_members` | Room membership and authorization roles | `UNIQUE(room_id, user_id)`, `role IN ('LEADER','MEMBER','GUEST','UPLOADER')` |
| `room_member_embeddings` | Enrolled 512-D ArcFace vectors (biometric store) | `UNIQUE(member_id)`, `vector(512)`, consent & revocation timestamps |
| `upload_batches` | Manifest and verification of multipart upload sessions | `UNIQUE(room_id, client_batch_id)` |
| `photos` | Photo metadata, storage keys, and processing status | `UNIQUE(batch_id, client_photo_id)`, `UNIQUE(room_id, object_key)` |
| `photo_faces` | Detected face bounding boxes and embeddings per photo | `UNIQUE(photo_id, face_index)`, `confidence >= 0.0 AND confidence <= 1.0` |
| `photo_user_matches` | Matched photos powering the **"My Pics"** gallery | `UNIQUE(photo_id, user_id)`, Composite FK to `(photo_id, room_id)` & `(room_id, user_id)` |
| `photo_processing_jobs` | Durable queue state machine with row-level leasing | `UNIQUE(photo_id, operation, model_version)`, `status IN ('READY','PROCESSING','COMPLETED','FAILED','RETRY')` |
| `outbox_events` | Transactional outbox for event distribution | `id UUID`, `delivery_state IN ('PENDING','DELIVERED','FAILED')` |
| `audit_events` | Audit log of critical actions (zero sensitive data) | No vectors, image bytes, tokens, or signed URLs |

---

## 📐 Room Security Boundary & Referential Integrity

The room is the primary security boundary. To prevent accidental cross-room data leaks, `photo_user_matches` enforces composite foreign keys:
```sql
CONSTRAINT fk_photo_user_matches_photo_room 
    FOREIGN KEY (photo_id, room_id) REFERENCES photos(id, room_id) ON DELETE CASCADE,
CONSTRAINT fk_photo_user_matches_room_member 
    FOREIGN KEY (room_id, user_id) REFERENCES room_members(room_id, user_id) ON DELETE CASCADE
```
This guarantees that a match cannot reference a photo from another room, nor can it match a user who is not an active member of that exact room.

---

## 🧠 pgvector Cosine Search

InsightFace `buffalo_l` outputs 512-dimensional L2-normalized float vectors.
Cosine similarity between two normalized vectors $u$ and $v$ corresponds to:
$$\text{similarity} = 1 - (u \Leftrightarrow v)$$

The search query filters strictly by room and active consent before computing similarity:
```sql
SELECT 
    rm.user_id,
    rm.room_id,
    1 - (rme.embedding <=> :probeEmbedding) AS similarity_score
FROM room_member_embeddings rme
JOIN room_members rm ON rm.id = rme.member_id
WHERE rm.room_id = :roomId
  AND rm.active = true
  AND rme.revoked_at IS NULL
  AND (1 - (rme.embedding <=> :probeEmbedding)) >= :threshold
ORDER BY similarity_score DESC;
```
For MVP event rooms (dozens to hundreds of guests), exact cosine distance provides microsecond latency with 100% recall. For large-scale rooms (>10,000 members), an HNSW index can be enabled:
```sql
CREATE INDEX idx_member_embeddings_hnsw 
ON room_member_embeddings 
USING hnsw (embedding vector_cosine_ops);
```

---

## ⚙️ Durable Job Queue & Lease Management

1. **Atomic Batch Finalization**:
   When the client finalizes an upload batch, a single transaction updates the batch to `PROCESSING`, moves uploaded photos to `QUEUED`, and inserts `photo_processing_jobs` rows.
2. **Lockless Claiming**:
   Workers claim tasks using Postgres row locks without blocking concurrent workers:
   ```sql
   SELECT id FROM photo_processing_jobs
   WHERE status IN ('READY', 'RETRY') AND available_at <= clock_timestamp()
   ORDER BY available_at ASC, created_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;
   ```
3. **Lease Watchdog**:
   Workers set `lease_until = now() + interval '60 seconds'`. If a worker crashes while processing, a watchdog query automatically detects expired leases and moves them to `RETRY` (with exponential backoff) or `FAILED` once max attempts are reached.

---

## 🔒 Biometric Privacy & Data Retention

- **Separation of Concerns**: Biometric vectors are kept in `room_member_embeddings` separate from `room_members`. A user's facial vector can be purged without destroying their membership history or attendance records.
- **Immediate Discard**: Raw enrollment selfies sent to `/enroll` are evaluated in-memory and discarded immediately after vector extraction. Raw image bytes are never persisted in the database.
- **Revocation & Room Deletion**:
  When a room is deleted or a guest revokes consent:
  1. The member embedding is flagged as revoked (`revoked_at = now()`) or hard deleted (`DELETE FROM room_member_embeddings`).
  2. The matches are purged (`DELETE FROM photo_user_matches WHERE room_id = :roomId`).
  3. Deletion requests for private R2 object keys are enqueued.
- **Audit Sanitization**: The `audit_events` table explicitly prohibits storing image bytes, presigned URLs, authentication tokens, or biometric vectors.

---

## 🚀 Running Migrations

### With Docker Compose
The `db/init.sql` script can be mounted into PostgreSQL's container initialization directory:
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/01_init.sql:ro
```

### With Spring Boot (Flyway)
The migration scripts follow standard Flyway naming conventions:
- Place or link `db/migrations/V1__initial_schema.sql` into Spring Boot's `src/main/resources/db/migration/`.
- Flyway will automatically apply migrations on backend startup.

### Manual / Local CLI Setup
To apply migrations directly to a running PostgreSQL instance:
```bash
psql -h localhost -U snaproom -d snaproom -f db/migrations/V1__initial_schema.sql
# Optional: Load test seed data
psql -h localhost -U snaproom -d snaproom -f db/migrations/V2__seed_dev_data.sql
```
