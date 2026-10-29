# Documentation Agent Context (`docs/`)

## 1. Purpose
This directory holds the living engineering documentation for SnapRoom. Whenever an agent modifies database tables, REST endpoints, or environment variables, it must update the corresponding file in `docs/`.

## 2. File Responsibilities
- `architecture.md`:
  - Documents the 4-component MVP architecture (React UI, Spring Boot 3.x API, Python FastAPI `InsightFace` CPU helper, PostgreSQL 16 `pgvector` + Cloudflare R2).
  - Contains sequence diagrams (Mermaid) for the 3 core flows:
    1. Room Join & Webcam Face Enrollment (Synchronous).
    2. Presigned Photo Upload & `@Async` Face Routing (Asynchronous background thread pool).
    3. "For You" Gallery & `StreamingResponseBody` Bulk ZIP Download.
- `api-endpoints.md`:
  - Complete REST contract specification for Spring Boot (`/api/...`) and internal AI service (`/extract-faces`), including request headers, multipart parameters, JSON request/response schemas, and HTTP status codes (`200`, `201`, `202 Accepted`, `400`, `401`, `403`).
- `setup.md`:
  - Step-by-step local onboarding guide: prerequisites (Docker, Java 21, Node 20+, Python 3.11), copying `.env.example`, starting `infra/docker-compose.yml`, configuring Cloudflare R2 CORS, and running the frontend dev server.