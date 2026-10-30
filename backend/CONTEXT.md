# Backend Agent Context (`backend/`)

## 1. Tech Stack & Role
- **Language & Framework:** Java 21 + Spring Boot 3.x (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`).
- **Database & Vector Mapping:** PostgreSQL 16 + `pgvector` mapped via `org.hibernate.orm:hibernate-vector` (`@JdbcTypeCode(SqlTypes.VECTOR)` and `@Array(length = 512)`).
- **Object Storage SDK:** AWS SDK for Java v2 (`software.amazon.awssdk:s3`) configured for Cloudflare R2, AWS S3, or MinIO.
- **Internal AI HTTP Client:** Spring Framework 6.1 synchronous `RestClient` calling the Python FastAPI service.

## 2. Package & Directory Responsibilities
- `src/main/java/com/snaproom/config/`
  - `AsyncConfig.java`: Annotated with `@Configuration` and `@EnableAsync`. Defines a `@Bean(name = "photoTaskExecutor")` `ThreadPoolTaskExecutor` (`corePoolSize=2`, `maxPoolSize=4`, `queueCapacity=500`, prefix `"PhotoWorker-"`) and the `RestClient` bean pointing to `${ai.service.url}`.
  - `S3Config.java`: Configures `S3Client` and `S3Presigner` beans with custom endpoint override support for Cloudflare R2 / MinIO.
  - `SecurityConfig.java`: Configures stateless JWT authentication filter, public auth endpoints, and CORS for the frontend origin.
- `src/main/java/com/snaproom/controller/`
  - `RoomController.java`:
    - `POST /api/rooms`: Creates a room, generates a unique `inviteCode`, assigns creator as `LEADER`.
    - `POST /api/rooms/{inviteCode}/enroll`: Accepts `MultipartFile` selfie, extracts a single 512-D `float[]` vector via `PhotoRoutingService.extractSingleFaceForEnrollment(...)`, saves `RoomMember`, and discards the image bytes.
    - `POST /api/rooms/{roomId}/presign-upload`: Uses `S3Presigner` to return a 5-minute presigned `PUT` URL and `objectKey` (`rooms/{roomId}/{uuid}-{fileName}`).
    - `POST /api/rooms/{roomId}/process-photos`: Registers uploaded photo keys as `PENDING`, triggers `photoRoutingService.processRoomPhotosAsync(...)`, and immediately returns `202 Accepted`.
    - `GET /api/rooms/{roomId}/photos/me`: Returns matched photos for the authenticated user with 1-hour presigned `GET` URLs.
    - `GET /api/rooms/{roomId}/photos`: Returns all room photos with 1-hour presigned `GET` URLs.
    - `POST /api/rooms/{roomId}/download-zip`: Returns `ResponseEntity<StreamingResponseBody>` with `Content-Type: application/zip`, streaming objects from `s3Client.getObject(...)` through a `ZipOutputStream` (`Deflater.BEST_SPEED`, 8 KB buffer).
    - `DELETE /api/rooms/{roomId}`: Explicit deletion by LEADER, purging storage and DB immediately.
- `src/main/java/com/snaproom/service/`
  - `RoomCleanupService.java`: Periodic background `@Scheduled` service sweeping expired rooms (`expiresAt < now()`), purging all photos from S3/R2 storage (direct keys + `rooms/{roomId}/` prefix) and cascading DB records deletion (`photo_user_matches`, `photos`, `room_members`, `rooms`).
  - `PhotoRoutingService.java`:
    - `extractSingleFaceForEnrollment(byte[] selfieBytes, String fileName)`: Calls Python `/extract-faces` synchronously; throws `IllegalArgumentException` if no face is detected.
    - `@Async("photoTaskExecutor") processRoomPhotosAsync(UUID roomId, List<Photo> pendingPhotos)`: Iterates through photos, fetches image bytes from S3/R2, posts to `/extract-faces` via `RestClient` and `MultipartBodyBuilder`, formats each `float[]` via `Arrays.toString(...)`, runs `memberRepository.findMatchingMembersInRoom(roomId, vectorLiteral, 0.50)`, upserts into `photo_user_matches`, and updates photo `status` to `COMPLETED` or `FAILED`.
- `src/main/java/com/snaproom/entity/`
  - `User.java`, `Room.java` (`expiresAt` TTL timestamp), `RoomMember.java`, `Photo.java`, `PhotoUserMatch.java`.
  - In `RoomMember.java`, annotate `private float[] embedding;` with `@JdbcTypeCode(SqlTypes.VECTOR)`, `@Array(length = 512)`, and `@Column(name = "embedding", nullable = false, columnDefinition = "vector(512)")`.
- `src/main/java/com/snaproom/repository/`
  - `RoomMemberRepository.java`: Includes native query `findMatchingMembersInRoom` using `1 - (embedding <=> CAST(:probeVector AS vector)) >= :threshold`.
  - `PhotoRepository.java`, `PhotoUserMatchRepository.java`, `RoomRepository.java`, `UserRepository.java`.
- `src/main/resources/`
  - `application.yml`: Configures PostgreSQL datasource, `spring.servlet.multipart.max-file-size: 15MB`, S3/R2 bucket settings, and AI service base URL.
- `src/test/` — JUnit 5 + MockMvc tests mocking `RestClient` and `S3Client`.
- `pom.xml` — Java 21, Spring Boot 3.x parent, `hibernate-vector`, `postgresql`, `software.amazon.awssdk:s3`.

## 3. Critical Spring Boot Pitfalls to Avoid
1. **`@Async` Self-Invocation:** Never call `@Async processRoomPhotosAsync(...)` from another method inside `PhotoRoutingService`—it must be invoked from `RoomController` (or an external bean) so Spring's proxy intercepts the call and runs it on `photoTaskExecutor`.
2. **Filename Required on `MultipartBodyBuilder`:** When sending `byte[]` via `RestClient` to FastAPI's `UploadFile`, wrap the bytes in a `ByteArrayResource` that overrides `getFilename()` to return a non-null string (e.g., `"image.jpg"`), otherwise FastAPI rejects the multipart part.
3. **Never Load ZIP Archives in Memory:** Always stream `ResponseInputStream<GetObjectResponse>` chunks directly into `ZipOutputStream` inside `StreamingResponseBody`.