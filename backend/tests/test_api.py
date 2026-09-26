import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

def test_scrna_pipeline_endpoint():
    response = client.post("/api/v1/pipeline/scrna/analyze")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "umap_coordinates" in data
    assert "clusters" in data

def test_enrichment_endpoint():
    response = client.get("/api/v1/pipeline/enrichment/test_comp_1")
    assert response.status_code in [200, 404]
