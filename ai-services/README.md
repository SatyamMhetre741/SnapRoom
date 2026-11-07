# SnapRoom — Facial Recognition AI Microservice (`ai-services`)

A high-performance, stateless computer vision microservice designed to detect human faces and extract 512-dimensional ArcFace biometric embeddings for automated photo routing in **SnapRoom (SendMyPics)**.

---

## 1. Overview & Architecture

The AI Service acts as an internal, stateless helper service called exclusively by the Spring Boot backend (`AiServiceClient`). It performs face detection, alignment, and biometric feature extraction using deep neural networks running on ONNX Runtime CPU.

```
┌─────────────────────────────────┐               ┌──────────────────────────────────────┐
│       Spring Boot Backend       │               │      FastAPI AI Service (8001)       │
│  (PhotoRoutingService / Worker) │               │                                      │
└────────────────┬────────────────┘               └──────────────────┬───────────────────┘
                 │                                                   │
                 │ 1. POST /extract-faces (multipart/form-data)      │
                 ├──────────────────────────────────────────────────>│
                 │                                                   │ 2. OpenCV decode
                 │                                                   │ 3. SCRFD Face Detection
                 │                                                   │ 4. 112x112 Alignment
                 │                                                   │ 5. ArcFace 512-D Embedding
                 │                                                   │ 6. L2-Normalization (||v||=1)
                 │ 7. JSON Response: {face_count, faces: [...]}      │
                 │<──────────────────────────────────────────────────┤
                 │                                                   │
┌────────────────┴────────────────┐                                  │
│  PostgreSQL 16 + pgvector (<=>) │                                  │
│  1 - (embedding <=> :probeVector) >= 0.50                          │
└─────────────────────────────────┘                                  │
```

### Key Characteristics:
- **Stateless & Decoupled:** Holds no database credentials or storage buckets. Spring Boot orchestrates photo retrieval from Cloudflare R2 / S3 and persists vector matches.
- **Model Singleton:** The InsightFace `buffalo_l` model pack is initialized exactly once at application startup, consuming ~420 MB RAM and avoiding expensive per-request model loading.
- **Normalized Embeddings:** Always returns L2-normalized 512-D vectors ($\|v\|_2 = 1.0$), ensuring mathematical equivalence with cosine distance `<=>` queries in PostgreSQL `pgvector`.

---

## 2. Tech Stack

- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11) + [Uvicorn](https://www.uvicorn.org/) ASGI server.
- **Model Pack:** [InsightFace](https://github.com/deepinsight/insightface) `buffalo_l`:
  - **Detector:** SCRFD-10GF (fast, multi-scale face and landmark detection).
  - **Landmark Extraction:** 2D (5-point) alignment to standard $112 \times 112$ crop.
  - **Recognition Backbone:** ResNet50-d trained with ArcFace (Additive Angular Margin Loss), outputting a 512-dimensional vector.
- **Inference Runtime:** [ONNX Runtime](https://onnxruntime.ai/) (`CPUExecutionProvider`).
- **Image Processing:** OpenCV Headless (`opencv-python-headless`) & NumPy.
- **Validation & Serialization:** Pydantic v2.

---

## 3. API Reference

### Health Check

```http
GET /health
```

#### Response (`200 OK`):
```json
{
  "status": "ok",
  "model": "buffalo_l",
  "provider": "CPUExecutionProvider"
}
```

---

### Extract Faces & Embeddings

```http
POST /extract-faces
Content-Type: multipart/form-data
```

#### Request Parameters:
| Field | Type | Description |
|---|---|---|
| `file` | `UploadFile` (binary) | Raw image file (JPEG, PNG, WebP). Max size enforced by upstream backend. |

#### Response (`200 OK`):
```json
{
  "face_count": 1,
  "faces": [
    {
      "confidence": 0.9852,
      "bbox": [124, 88, 310, 320],
      "embedding": [
        0.041235, -0.018942, 0.089123, 0.012456, ..., -0.034120
      ]
    }
  ]
}
```

#### Error Responses:
- `400 Bad Request`: Returned when uploaded file is empty or cannot be decoded as a valid image format by OpenCV (`{"detail": "Invalid image file"}`).
- `422 Unprocessable Entity`: Returned when the multipart request is missing the required `file` parameter.

---

### Interactive Documentation
- **Swagger UI:** `http://localhost:8001/docs`
- **ReDoc:** `http://localhost:8001/redoc`

---

## 4. Backend Integration Contract

The response structure strictly matches the Java DTOs in Spring Boot's `AiServiceClient.java`:

```java
public record FaceDetail(
    float confidence,
    List<Integer> bbox,
    List<Float> embedding
) {}

public record FaceExtractionResponse(
    @JsonProperty("face_count") int faceCount,
    List<FaceDetail> faces
) {}
```

During photo processing, Spring Boot's `@Async photoTaskExecutor` parses each 512-D `float[]` embedding and executes the pgvector cosine distance query:
```sql
SELECT rm.* FROM room_members rm
WHERE rm.room_id = :roomId
  AND (1 - (rm.embedding <=> CAST(:probeVector AS vector))) >= 0.50
ORDER BY (1 - (rm.embedding <=> CAST(:probeVector AS vector))) DESC;
```

---

## 5. Local Setup & Execution

### Prerequisites
- Python 3.11 or 3.12
- C/C++ compiler toolchain (for building insightface extensions if wheels are not cached)

### Installation

1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux / macOS:
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

---

## 6. Docker & Containerization

### Standalone Docker Build

The Dockerfile builds a self-contained image and pre-downloads the `buffalo_l` model weights during the build phase to eliminate cold starts:

```bash
docker build -t snaproom-ai-service ./ai-services
docker run -p 8001:8001 snaproom-ai-service
```

### Docker Compose

In the root `docker-compose.yaml`:
```yaml
ai-service:
  build: ./ai-services
  container_name: snaproom-ai
  ports:
    - "8001:8001"
  volumes:
    - insightface_cache:/root/.insightface
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
    interval: 10s
    timeout: 5s
    retries: 3
```

---

## 7. Automated Testing

Run the test suite using `pytest`:
```bash
pytest ai-services/tests/ -v
```

The test suite covers:
- Service health endpoint verification (`GET /health`).
- Empty payload and corrupt bytes handling (`POST /extract-faces` -> `400 Bad Request`).
- Missing parameter handling (`POST /extract-faces` -> `422 Unprocessable Entity`).
- Detection output schema verification (confidence float, 4-element int bounding box, 512-D float embedding).
- Mathematical verification of L2 normalization ($\|v\|_2 \approx 1.0$).

