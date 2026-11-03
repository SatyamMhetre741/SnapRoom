# AI Service Agent Context (`ai-services/`)

## Role

Python 3.11 + FastAPI is a stateless internal inference service. It receives one image from the backend, detects faces, and returns embeddings. It has no Postgres, R2, user, room, or queue access.

## Contract

- `GET /health` returns service/model readiness.
- `POST /extract-faces` accepts one multipart image and returns `{modelVersion, faceCount, faces}`.
- Each face contains `confidence`, `bbox`, and a 512-float L2-normalized ArcFace embedding.
- Invalid image bytes return 400; overload returns 429/503; successful no-face detection returns 200 with an empty list.

Load InsightFace `buffalo_l` once at startup. Keep request handling bounded with a concurrency limit because CPU inference is expensive. Never log image bytes or embeddings and never persist input files. The backend owns retries and job state; AI should not retry a request indefinitely.

The AI result does not identify a user. The backend performs room-scoped pgvector matching after the response.
