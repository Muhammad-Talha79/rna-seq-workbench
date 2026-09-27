import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

def test_alignment_endpoint():
    response = client.post(
        "/api/v1/pipeline/align",
        json={"sra_accession": "SRR3734796", "threads": 4}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "started"
    assert "job_id" in data

def test_deseq2_endpoint():
    response = client.post(
        "/api/v1/pipeline/deseq2",
        json={"control_job_id": "ctrl_1", "treated_job_id": "treat_1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "report_url" in data

def test_enrichment_endpoint():
    response = client.get("/api/v1/pipeline/enrichment/test_comp")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "results" in data

def test_scrna_pipeline_endpoint():
    response = client.post("/api/v1/pipeline/scrna/analyze")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "umap_coordinates" in data
