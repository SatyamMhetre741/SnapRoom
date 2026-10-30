import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from insightface.app import FaceAnalysis

app = FastAPI(title="SnapRoom Face AI Helper")

# Load InsightFace buffalo_l on CPU once at startup (~420 MB RAM)
face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.5)

@app.post("/extract-faces")
async def extract_faces(file: UploadFile = File(...)):
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Detects faces, aligns to 112x112, and computes 512-D L2-normalized ArcFace embeddings
    faces = face_app.get(img)

    results = []
    for face in faces:
        results.append({
            "confidence": float(face.det_score),
            "embedding": face.normed_embedding.tolist() # 512 floats
        })

    return {"face_count": len(results), "faces": results}