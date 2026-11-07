import io
import math
import numpy as np
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

import main
from main import app
import pipeline


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def dummy_face():
    """Mock InsightFace Face object with 512-D normalized embedding."""
    # Create a random 512-D vector and L2-normalize it
    raw_vec = np.random.randn(512).astype(np.float32)
    norm = np.linalg.norm(raw_vec)
    normed_vec = raw_vec / norm

    face = MagicMock()
    face.det_score = np.float32(0.985)
    face.bbox = np.array([45.2, 60.1, 180.7, 210.4])
    face.normed_embedding = normed_vec
    return face


def test_root_endpoint(client):
    """Test GET / returns service information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "SnapRoom Face AI Helper"
    assert data["status"] == "running"
    assert "/health" in data["endpoints"].values()
    assert "/extract-faces" in data["endpoints"].values()


def test_health_endpoint(client):
    """Test GET /health returns expected status and model configuration."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model"] == "buffalo_l"
    assert data["provider"] == "CPUExecutionProvider"


def test_extract_faces_missing_file(client):
    """Test POST /extract-faces without any file in request body returns 422."""
    response = client.post("/extract-faces")
    assert response.status_code == 422


def test_extract_faces_empty_file(client):
    """Test POST /extract-faces with a 0-byte file returns 400 Bad Request."""
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/extract-faces",
        files={"file": ("empty.jpg", empty_file, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Invalid image file" in response.json()["detail"]


def test_extract_faces_corrupt_bytes(client):
    """Test POST /extract-faces with non-image bytes returns 400 Bad Request."""
    corrupt_data = io.BytesIO(b"This is definitely not an image file format.")
    response = client.post(
        "/extract-faces",
        files={"file": ("corrupt.jpg", corrupt_data, "image/jpeg")}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid image file"


def test_extract_faces_no_faces_detected(client):
    """Test POST /extract-faces with valid synthetic image where no faces are detected."""
    with patch("main.extract_embeddings_from_bytes", return_value=[]):
        dummy_file = io.BytesIO(b"valid_image_bytes")
        response = client.post(
            "/extract-faces",
            files={"file": ("blank.jpg", dummy_file, "image/jpeg")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["face_count"] == 0
        assert data["faces"] == []


def test_extract_faces_success_format(client, dummy_face):
    """Test POST /extract-faces verifies 512-D embedding format and coordinates."""
    mock_results = [{
        "confidence": float(dummy_face.det_score),
        "bbox": dummy_face.bbox.astype(int).tolist(),
        "embedding": dummy_face.normed_embedding.tolist(),
    }]

    with patch("main.extract_embeddings_from_bytes", return_value=mock_results):
        dummy_file = io.BytesIO(b"valid_image_bytes")
        response = client.post(
            "/extract-faces",
            files={"file": ("face.jpg", dummy_file, "image/jpeg")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["face_count"] == 1
        assert len(data["faces"]) == 1

        face_detail = data["faces"][0]
        # Check confidence
        assert isinstance(face_detail["confidence"], float)
        assert math.isclose(face_detail["confidence"], 0.985, rel_tol=1e-3)

        # Check bbox is 4 integers
        assert len(face_detail["bbox"]) == 4
        assert face_detail["bbox"] == [45, 60, 180, 210]
        assert all(isinstance(x, int) for x in face_detail["bbox"])

        # Check embedding length is exactly 512
        embedding = face_detail["embedding"]
        assert len(embedding) == 512
        assert all(isinstance(x, float) for x in embedding)

        # Check L2 normalization: sqrt(sum(x^2)) ~= 1.0
        l2_norm = math.sqrt(sum(x * x for x in embedding))
        assert math.isclose(l2_norm, 1.0, rel_tol=1e-4)


def test_pipeline_extract_embeddings_corrupt():
    """Test pipeline.extract_embeddings_from_bytes handles corrupt bytes gracefully."""
    assert pipeline.extract_embeddings_from_bytes(b"") is None
    assert pipeline.extract_embeddings_from_bytes(b"invalid bytes") is None

