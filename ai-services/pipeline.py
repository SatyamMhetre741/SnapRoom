import os
import logging
from typing import List, Optional, Dict, Any
import cv2
import numpy as np
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

# Constants & environment configuration
MODEL_NAME = os.getenv("INSIGHTFACE_MODEL", "buffalo_l")
EXECUTION_PROVIDER = os.getenv("EXECUTION_PROVIDER", "CPUExecutionProvider")
DET_SIZE = (640, 640)
DET_THRESH = float(os.getenv("DET_THRESH", "0.5"))


def init_face_app() -> FaceAnalysis:
    """
    Initializes the InsightFace FaceAnalysis singleton instance on CPU.
    Loads buffalo_l model pack (detection, 2D/3D landmarks, recognition).
    """
    logger.info("Initializing FaceAnalysis(name='%s', providers=['%s'])...", MODEL_NAME, EXECUTION_PROVIDER)
    app = FaceAnalysis(name=MODEL_NAME, providers=[EXECUTION_PROVIDER])
    try:
        app.prepare(ctx_id=0, det_size=DET_SIZE, det_thresh=DET_THRESH)
    except Exception as e:
        logger.warning("app.prepare(ctx_id=0) encountered exception: %s. Retrying with ctx_id=-1...", e)
        app.prepare(ctx_id=-1, det_size=DET_SIZE, det_thresh=DET_THRESH)
    logger.info("FaceAnalysis '%s' loaded and prepared successfully.", MODEL_NAME)
    return app


# Singleton model instance
face_app: Optional[FaceAnalysis] = None

try:
    face_app = init_face_app()
except Exception as exc:
    logger.warning("Eager FaceAnalysis initialization deferred or failed: %s. Will initialize upon first use.", exc)


def get_face_app() -> FaceAnalysis:
    """
    Returns the singleton FaceAnalysis instance, initializing it if not yet loaded.
    """
    global face_app
    if face_app is None:
        face_app = init_face_app()
    return face_app


def extract_embeddings_from_bytes(image_bytes: bytes) -> Optional[List[Dict[str, Any]]]:
    """
    Decodes raw image bytes and extracts 512-dimensional L2-normalized face embeddings.

    Args:
        image_bytes: Raw bytes representing an image (JPEG, PNG, WebP, etc.).

    Returns:
        None if the image bytes cannot be decoded by OpenCV (corrupt/invalid file).
        List of dicts for each detected face:
            - confidence (float): Detection confidence score (det_score).
            - bbox (List[int]): Bounding box coordinates [x1, y1, x2, y2].
            - embedding (List[float]): 512-D L2-normalized ArcFace embedding vector.
    """
    if not image_bytes:
        return None

    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        logger.error("Error decoding image bytes: %s", e)
        return None

    if img is None:
        return None

    app = get_face_app()
    faces = app.get(img)

    results: List[Dict[str, Any]] = []
    for face in faces:
        bbox = face.bbox.astype(int).tolist() if hasattr(face.bbox, "astype") else [int(c) for c in face.bbox]
        confidence = float(face.det_score) if hasattr(face, "det_score") else float(getattr(face, "score", 0.0))
        # Ensure 512-D L2-normalized float embedding
        normed_emb = face.normed_embedding
        embedding = normed_emb.tolist() if hasattr(normed_emb, "tolist") else [float(x) for x in normed_emb]

        results.append({
            "confidence": confidence,
            "bbox": bbox,
            "embedding": embedding,
        })

    return results

