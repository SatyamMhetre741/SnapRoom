import logging
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from pydantic import BaseModel, Field

from pipeline import (
    MODEL_NAME,
    EXECUTION_PROVIDER,
    get_face_app,
    extract_embeddings_from_bytes,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("snaproom-ai")


class FaceDetail(BaseModel):
    confidence: float = Field(..., description="Detection confidence score (0.0 to 1.0)")
    bbox: List[int] = Field(..., description="Bounding box [x1, y1, x2, y2] in pixels")
    embedding: List[float] = Field(
        ...,
        description="512-dimensional L2-normalized ArcFace embedding vector"
    )


class FaceExtractionResponse(BaseModel):
    face_count: int = Field(..., description="Number of faces detected in the image")
    faces: List[FaceDetail] = Field(..., description="List of detected face details")


class HealthResponse(BaseModel):
    status: str = Field(..., example="ok")
    model: str = Field(..., example="buffalo_l")
    provider: str = Field(..., example="CPUExecutionProvider")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up / verify model is ready on application startup
    logger.info("SnapRoom Face AI Service starting up...")
    try:
        get_face_app()
        logger.info("FaceAnalysis model pre-warmed and ready.")
    except Exception as e:
        logger.error("Failed to pre-warm FaceAnalysis model during startup: %s", e)
    yield
    logger.info("SnapRoom Face AI Service shutting down.")


app = FastAPI(
    title="SnapRoom Face AI Helper",
    description="Stateless facial recognition microservice extracting 512-D L2-normalized embeddings via InsightFace buffalo_l.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/", tags=["Info"])
def root():
    """Root endpoint returning service identity and available endpoints."""
    return {
        "service": "SnapRoom Face AI Helper",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "extract_faces": "/extract-faces",
            "docs": "/docs",
        },
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health():
    """
    Health check endpoint returning the status, model pack name, and execution provider.
    """
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "provider": EXECUTION_PROVIDER,
    }


@app.post(
    "/extract-faces",
    response_model=FaceExtractionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Face Extraction"],
    summary="Detect faces and extract 512-D normalized embeddings",
)
async def extract_faces(file: UploadFile = File(..., description="Image file (JPEG, PNG, WebP)")):
    """
    Accepts an uploaded image file, detects all present human faces, and returns
    512-dimensional L2-normalized embeddings along with confidence scores and bounding boxes.
    """
    try:
        image_bytes = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file",
        )

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file: file is empty",
        )

    results = extract_embeddings_from_bytes(image_bytes)

    if results is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file",
        )

    return {
        "face_count": len(results),
        "faces": results,
    }
