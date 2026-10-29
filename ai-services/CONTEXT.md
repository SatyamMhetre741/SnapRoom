# AI Service Agent Context (`ai-service/`)

## 1. Tech Stack & Role
- **Runtime & Framework:** Python 3.11 + FastAPI + Uvicorn.
- **CV & Inference Stack:** `insightface==0.7.3` (`buffalo_l` model pack), `onnxruntime==1.19.2` (`CPUExecutionProvider`), `opencv-python-headless==4.10.0.84`, `numpy==1.26.4`.
- **Role:** A stateless internal HTTP helper called exclusively by the Spring Boot backend. It accepts an image file and returns all detected faces along with their 512-dimensional L2-normalized ArcFace embeddings.

## 2. File Responsibilities
- `pipeline.py` — Face detection and embedding extraction logic:
  - Initializes `FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])` once as a module-level singleton at startup (`ctx_id=0`, `det_size=(640, 640)`, `det_thresh=0.5`).
  - Exposes a function `extract_embeddings_from_bytes(image_bytes: bytes) -> list[dict]` that decodes bytes with `np.frombuffer` and `cv2.imdecode(nparr, cv2.IMREAD_COLOR)`, runs `face_app.get(img)` (which detects faces, aligns them to `112x112`, and computes 512-D normalized vectors), and returns `[{"confidence": float(face.det_score), "bbox": face.bbox.astype(int).tolist(), "embedding": face.normed_embedding.tolist()}]`.
- `main.py` — FastAPI HTTP endpoints:
  - `GET /health`: Returns `{"status": "ok", "model": "buffalo_l", "provider": "CPUExecutionProvider"}`.
  - `POST /extract-faces`: Accepts `file: UploadFile = File(...)`, reads bytes, delegates to `pipeline.extract_embeddings_from_bytes(image_bytes)`, raises `HTTPException(status_code=400, detail="Invalid image file")` if OpenCV cannot decode the bytes, and returns `{"face_count": len(results), "faces": results}`.
- `requirements.txt` — Pinned dependencies (`fastapi==0.115.0`, `uvicorn==0.30.6`, `python-multipart==0.0.9`, `insightface==0.7.3`, `onnxruntime==1.19.2`, `opencv-python-headless==4.10.0.84`, `numpy==1.26.4`, `pytest==8.3.2`, `httpx==0.27.2`).
- `Dockerfile` — Uses `python:3.11-slim`, installs `build-essential` and `libgl1` / `libglib2.0-0` required by `insightface` and OpenCV, installs `requirements.txt`, pre-downloads or caches `~/.insightface/models/buffalo_l`, and runs `uvicorn main:app --host 0.0.0.0 --port 8001`.
- `tests/` — `test_extract_faces.py` using FastAPI `TestClient` to verify:
  1. Valid image returns `200 OK` and 512-length float lists.
  2. Corrupted/non-image bytes return `400 Bad Request`.

## 3. Strict AI Service Rules
1. **Load Model Only Once:** Never instantiate `FaceAnalysis(name="buffalo_l")` inside the request handler; it takes ~420 MB RAM and several seconds to load. Keep it as a singleton in `pipeline.py`.
2. **Use `normed_embedding`:** Always return `face.normed_embedding.tolist()` (L2-normalized 512 floats) so PostgreSQL `pgvector` cosine similarity (`1 - (embedding <=> :probe)`) produces accurate scores against the `0.50` threshold.
3. **Stateless Execution:** Do not connect to PostgreSQL or S3 from Python—Spring Boot owns all persistence and storage orchestration.