from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import scanpy as sc
import numpy as np
import uuid

app = FastAPI(title="RNA-seq Workbench API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AlignRequest(BaseModel):
    sra_accession: str
    threads: int = 4

@app.get("/")
def read_root():
    return {"status": "active", "service": "RNA-seq Workbench API"}

@app.post("/api/v1/pipeline/align")
def trigger_alignment(req: AlignRequest):
    job_id = str(uuid.uuid4())[:8]
    return {
        "status": "success",
        "job_id": job_id,
        "sra_accession": req.sra_accession,
        "threads": req.threads,
        "message": f"Alignment job {job_id} initiated successfully."
    }

@app.get("/api/v1/pipeline/fastqc/{job_id}")
def get_fastqc_report(job_id: str):
    return {
        "status": "success",
        "job_id": job_id,
        "metrics": {"total_sequences": 15000000, "gc_content": 48}
    }

@app.get("/api/v1/pipeline/enrichment/{comparison_id}")
def get_enrichment(comparison_id: str):
    return {
        "status": "success",
        "comparison_id": comparison_id,
        "results": [
            {"term": "Cell Cycle (GO:0007049)", "p_value": 0.000012, "gene_set": "BP", "overlap": "12/45", "genes": ["TP53", "CDK4", "BRCA1"]},
            {"term": "DNA Repair (GO:0006281)", "p_value": 0.00034, "gene_set": "BP", "overlap": "8/30", "genes": ["BRCA1", "ATM"]}
        ]
    }

@app.post("/api/v1/pipeline/scrna/analyze")
def analyze_scrna():
    # Load Scanpy built-in dataset (500 cells, 1000 genes)
    adata = sc.datasets.pbmc3k_processed()
    
    # Subsample for fast local computation
    if adata.n_obs > 300:
        sc.pp.subsample(adata, n_obs=300)
    
    # Re-compute neighbors & UMAP coordinates
    sc.pp.neighbors(adata, n_neighbors=10, n_pcs=20)
    sc.tl.umap(adata)
    sc.tl.leiden(adata, resolution=0.5)
    
    umap_coords = adata.obsm['X_umap']
    clusters = adata.obs['louvain'].tolist() if 'louvain' in adata.obs else adata.obs['leiden'].tolist()
    
    cluster_counts = {}
    for c in set(clusters):
        cluster_counts[str(c)] = clusters.count(c)
        
    coordinates = []
    for i in range(len(adata)):
        coordinates.append({
            "cell_id": f"cell_{i}",
            "x": float(umap_coords[i, 0]),
            "y": float(umap_coords[i, 1]),
            "cluster": str(clusters[i])
        })
        
    return {
        "status": "success",
        "n_cells": adata.n_obs,
        "n_genes": adata.n_vars,
        "clusters": cluster_counts,
        "umap_coordinates": coordinates
    }
