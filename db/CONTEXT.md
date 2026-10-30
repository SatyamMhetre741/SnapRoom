# Database Agent Context (`database/`)

## 1. Tech Stack & Role
- **Engine:** PostgreSQL 16 with `uuid-ossp` and `pgvector` (`vector`) extensions (`pgvector/pgvector:pg16`).
- **Role:** Single source of truth for relational entities (`users`, `rooms`, `photos`, `photo_user_matches`) and 512-dimensional facial embeddings (`room_members.embedding vector(512)`).

## 2. Directory Responsibilities
- `migrations/` — Versioned SQL migration scripts (compatible with Flyway or init scripts):
  - `V1__enable_extensions.sql`: Enables `uuid-ossp` and `vector` extensions.
  - `V2__create_core_tables.sql`: Creates the 5 core tables:
    1. `users` (`id UUID PK`, `email UNIQUE`, `display_name`, `password_hash`, `created_at`).
    2. `rooms` (`id UUID PK`, `invite_code VARCHAR(32) UNIQUE`, `name`, `leader_id UUID FK -> users`, `created_at`, `expires_at TIMESTAMP WITH TIME ZONE NOT NULL`).
    3. `room_members` (`id UUID PK`, `room_id UUID FK -> rooms`, `user_id UUID FK -> users`, `role VARCHAR(20)`, `embedding vector(512) NOT NULL`, `enrolled_at`, `UNIQUE(room_id, user_id)`).
    4. `photos` (`id UUID PK`, `room_id UUID FK -> rooms`, `uploader_id UUID FK -> users`, `object_key TEXT NOT NULL`, `file_name VARCHAR(255) NOT NULL`, `status VARCHAR(20) DEFAULT 'PENDING'`, `created_at`).
    5. `photo_user_matches` (`id UUID PK`, `photo_id UUID FK -> photos`, `room_id UUID FK -> rooms`, `user_id UUID FK -> users`, `similarity_score REAL NOT NULL`, `created_at`, `UNIQUE(photo_id, user_id)`).
  - `V3__create_indexes.sql`: Creates standard B-Tree indexes `idx_room_members_room ON room_members(room_id)` and `idx_matches_room_user ON photo_user_matches(room_id, user_id)`.
- `schema/`
  - `schema.sql`: Consolidated reference schema combining all tables, constraints, and indexes.
- `seed/`
  - `dev_seed.sql`: Inserts test users (`leader@snaproom.local`, `alice@snaproom.local`, `bob@snaproom.local`), a sample room (`invite_code = 'party-demo'`), and sample 512-dimensional normalized test vectors for local integration testing.

## 3. Query & Indexing Rules
1. **No HNSW / IVFFlat Needed in MVP:** Because queries always filter by `WHERE room_id = :roomId` first and a typical room has fewer than 500 members, a standard B-Tree index on `room_id` performs an exact scan in under 1 millisecond.
2. **Cosine Similarity Formula:** Always compute similarity as `1 - (embedding <=> CAST(:probeVector AS vector))` using `pgvector`'s cosine distance operator (`<=>`) against a default match threshold of `0.50`.
3. **Idempotent Match Upserts:** When inserting into `photo_user_matches` (in case a photo is reprocessed or a user's face appears twice by mistake), always use `ON CONFLICT (photo_id, user_id) DO UPDATE SET similarity_score = GREATEST(photo_user_matches.similarity_score, EXCLUDED.similarity_score)`.
4. **Room TTL & Automated Purge:** Rooms expire after 2 days (`expires_at = created_at + 2 days`). A scheduled cleanup task purges expired rooms, deleting all image objects from S3/R2 storage, and cascades deletion across `photo_user_matches`, `photos`, `room_members`, and `rooms`.