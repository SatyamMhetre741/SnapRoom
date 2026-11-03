# Infrastructure Agent Context (`infra/`)

## Runtime topology

Frontend can run on Vercel or another edge host. The backend API, a worker process, AI service, and Postgres run in a private network. Cloudflare R2 is private and accessed with S3-compatible credentials held only by backend/worker. AI and Postgres have no public ingress.

For the MVP, the worker polls `photo_processing_jobs` in Postgres. It may be a separate backend worker container or a bounded worker mode in the backend deployment. Keep the worker stateless; all work state lives in Postgres. When throughput requires it, publish outbox events to Cloudflare Queues/SQS/RabbitMQ while keeping the DB job row and idempotency key.

## Deployment requirements

- private R2 bucket and least-privilege access keys;
- TLS at the public API and strict CORS for the frontend origin;
- private network policy from backend/worker to AI and Postgres only;
- persistent Postgres volume and pgvector image;
- health/readiness checks for API, worker, AI model readiness, and database;
- secrets through environment/secret manager, never committed;
- structured metrics for upload completion, queue depth/age, processing latency, AI errors, retries, match count, and failed photos.

Do not expose the AI port, Postgres port, R2 secret, or presigned upload-generation endpoint without JWT/room authorization. Configure R2 CORS only for the frontend origin and required `PUT` headers; CORS does not make the bucket public.

## Reliability operations

Run migrations before workers. Start workers only after Postgres and AI readiness. Support graceful shutdown: stop claiming new jobs, finish or release leases, then exit. Alert on queue age, repeated failures, expired leases, and R2/AI latency. Keep a replay/retry command that only requeues authorized failed photo ids.

## Scaling path

First scale worker count within CPU/RAM limits and tune inference concurrency. Later separate API and worker autoscaling and replace polling delivery with a managed queue. The Postgres job row remains authoritative for status and idempotency.
