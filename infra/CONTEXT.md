# Infrastructure Agent Context (`infra/`)

## 1. Tech Stack & Role
- **Container Orchestration:** Docker & Docker Compose v2.
- **Object Storage:** Cloudflare R2 (production/staging for `$0.00/GB` egress) or MinIO (optional local offline S3 emulator).
- **Deployment Target:** Single 4 GB RAM Linux VPS (Hetzner, DigitalOcean, or Render) for backend + AI + Postgres, and Vercel for the Next.js frontend.

## 2. Directory Responsibilities
- `docker-compose.yml` — Local development stack:
  - `postgres`: Image `pgvector/pgvector:pg16`, mounts `../database/migrations` to `/docker-entrypoint-initdb.d/`, exposes port `5432`, persists volume `pgdata`.
  - `ai-service`: Builds `../ai-service`, exposes port `8001`, caches InsightFace models in a named volume `insightface_cache:/root/.insightface` so `buffalo_l` is not re-downloaded on container rebuilds.
  - `spring-backend`: Builds `../backend`, exposes port `8080`, injects database and R2/S3 environment variables, depends on `postgres` and `ai-service`.
- `docker-compose.prod.yml` — Production overrides:
  - Adds `restart: unless-stopped` to all services.
  - Removes host port bindings for `postgres` (`5432`) and `ai-service` (`8001`) so only `spring-backend` (`8080`) or a reverse proxy is reachable outside the Docker network.
- `storage/` — Object storage documentation & policies:
  - `cors-policy.json`: Required CORS configuration for Cloudflare R2 / AWS S3 allowing `PUT` and `GET` from the frontend origin with `Content-Type` and `ETag` headers exposed so browser presigned uploads succeed.
  - `r2-setup.md`: Step-by-step instructions to create a private R2 bucket (`snaproom-photos`) and generate S3 API tokens.
- `deployment/` — Automation scripts:
  - `deploy.sh`: Pulls latest git changes, runs `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build`, and prunes dangling images.

## 3. Infrastructure Rules
1. **Never Expose `ai-service` Publicly in Production:** The Python `/extract-faces` service has no authentication layer and must only be reachable by `spring-backend` over the internal Docker bridge network (`http://ai-service:8001`).
2. **Persist Model Weights Volume:** Always mount a persistent volume to `/root/.insightface` on `ai-service` so container restarts start in seconds without downloading the ~300 MB `buffalo_l` ONNX weights again.