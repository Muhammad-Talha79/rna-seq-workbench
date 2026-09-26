from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import scanpy as sc
import asyncio
import uuid

app = FastAPI(title="RNA-seq Workbench API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for tracking pipeline job states and logs
JOBS_DB = {}

class AlignRequest(BaseModel):
    sra_accession: str
    threads: int = 4

def run_alignment_pipeline_simulation(job_id: str, sra: str, threads: int):
    JOBS_DB[job_id] = {
        "status": "RUNNING",
        "progress": 10,
        "logs": [f"[SYSTEM] Job {job_id} initiated for SRA {sra} ({threads} threads)"]
    }
    
    # Simulate step 1: SRA Download
    asyncio.run(asyncio.sleep(3))
    JOBS_DB[job_id]["progress"] = 35
    JOBS_DB[job_id]["logs"].append(f"[FASTQ-DUMP] Fastq files extracted for {sra}.")

    # Simulate step 2: HISAT2 Alignment
    asyncio.run(asyncio.sleep(4))
    JOBS_DB[job_id]["progress"] = 70
    JOBS_DB[job_id]["logs"].append(f"[HISAT2] Alignment complete against GRCh38 reference index.")

    # Simulate step 3: Quantification
    asyncio.run(asyncio.sleep(3))
    JOBS_DB[job_id]["progress"] = 100
    JOBS_DB[job_id]["status"] = "COMPLETED"
    JOBS_DB[job_id]["logs"].append(f"[FEATURECOUNTS] Quantified gene counts. Output saved to app.db.")

@app.post("/api/v1/pipeline/align")
def trigger_alignment(req: AlignRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    JOBS_DB[job_id] = {"status": "PENDING", "progress": 0, "logs": ["[SYSTEM] Queueing alignment job..."]}
    
    # Run long task in background
    background_tasks.add_task(run_alignment_pipeline_simulation, job_id, req.sra_accession, req.threads)
    
    return {"status": "started", "job_id": job_id}

@app.get("/api/v1/pipeline/status/{job_id}")
def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job ID not found")
    return JOBS_DB[job_id]

@app.get("/api/v1/pipeline/fastqc/{job_id}")
def get_fastqc_report(job_id: str):
    return {"status": "success", "job_id": job_id, "metrics": {"total_sequences": 15000000, "gc_content": 48}}

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
    adata = sc.datasets.pbmc3k_processed()
    if adata.n_obs > 300:
        sc.pp.subsample(adata, n_obs=300)
    
    sc.pp.neighbors(adata, n_neighbors=10, n_pcs=20)
    sc.tl.umap(adata)
    sc.tl.leiden(adata, resolution=0.5)
    
    umap_coords = adata.obsm['X_umap']
    clusters = adata.obs['louvain'].tolist() if 'louvain' in adata.obs else adata.obs['leiden'].tolist()
    
    cluster_counts = {str(c): clusters.count(c) for c in set(clusters)}
    coordinates = [
        {"cell_id": f"cell_{i}", "x": float(umap_coords[i, 0]), "y": float(umap_coords[i, 1]), "cluster": str(clusters[i])}
        for i in range(len(adata))
    ]
    
    return {"status": "success", "n_cells": adata.n_obs, "n_genes": adata.n_vars, "clusters": cluster_counts, "umap_coordinates": coordinates}
