# SnapRoom — Root Agent Context

## 1. Project Overview
SnapRoom is an event-scoped, facial-routing photo sharing web platform.
- An event host creates a Room (becomes `LEADER`) and shares an `invite_code` link or QR code.
- Before entering a room, each participant takes a webcam selfie in the browser to enroll their 512-dimensional face vector. Raw enrollment selfies are discarded immediately after vector extraction.
- When the leader bulk-uploads event photos, files upload directly to S3-compatible storage (Cloudflare R2 or MinIO) via presigned `PUT` URLs.
- Spring Boot triggers an `@Async` background task that sends each photo to the local Python FastAPI service (`InsightFace` `buffalo_l` on CPU), extracts all 512-D face embeddings, and runs a PostgreSQL `pgvector` cosine similarity search (`>= 0.50`) against the room's enrolled members.
- Matched photos populate each member's **"For You"** tab, while **"All Room Photos"** shows the entire event gallery. Users can bulk-download either view as a streaming `.zip` archive.

## 2. Monorepo Directory Map
```text
snaproom/
├── frontend/        # Next.js / React + TypeScript UI (Port 3000)
├── backend/         # Java 21 + Spring Boot 3.x Core API (Port 8080)
├── ai-service/      # Python 3.11 + FastAPI + InsightFace CPU Service (Port 8001)
├── database/        # PostgreSQL 16 + pgvector migrations, schema, and seed data (Port 5432)
├── infra/           # Docker Compose (dev & prod), storage CORS rules, deploy scripts
├── docs/            # System architecture, REST API docs, and developer setup guides
├── .gitignore
├── README.md
└── .env.example