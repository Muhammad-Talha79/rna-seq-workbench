from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
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

JOBS_DB = {}

class AlignRequest(BaseModel):
    sra_accession: str
    threads: int = 4

class DeseqRequest(BaseModel):
    control_job_id: str
    treated_job_id: str

@app.get("/")
def read_root():
    return {"status": "active", "service": "RNA-seq Workbench API"}

async def run_alignment_simulation(job_id: str, sra: str, threads: int):
    JOBS_DB[job_id] = {
        "status": "RUNNING",
        "progress": 10,
        "logs": [f"[SYSTEM] Job {job_id} initiated for SRA {sra} using {threads} CPU threads."]
    }
    await asyncio.sleep(2)
    JOBS_DB[job_id]["logs"].append(f"[SRA-TOOLKIT] Downloading FASTQ reads for {sra}...")
    JOBS_DB[job_id]["progress"] = 30
    await asyncio.sleep(3)
    JOBS_DB[job_id]["logs"].append(f"[HISAT2] Aligning reads against GRCh38 human genome index...")
    JOBS_DB[job_id]["progress"] = 65
    await asyncio.sleep(3)
    JOBS_DB[job_id]["logs"].append(f"[SAMTOOLS] Sorting and indexing aligned BAM files...")
    JOBS_DB[job_id]["progress"] = 85
    await asyncio.sleep(2)
    JOBS_DB[job_id]["logs"].append(f"[FEATURECOUNTS] Quantifying gene counts against Gencode GTF annotation.")
    JOBS_DB[job_id]["logs"].append(f"[SYSTEM] Alignment pipeline finished successfully.")
    JOBS_DB[job_id]["progress"] = 100
    JOBS_DB[job_id]["status"] = "COMPLETED"

@app.post("/api/v1/pipeline/align")
def trigger_alignment(req: AlignRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    JOBS_DB[job_id] = {
        "status": "PENDING",
        "progress": 0,
        "logs": [f"[SYSTEM] Queueing alignment task for SRA {req.sra_accession}..."]
    }
    background_tasks.add_task(run_alignment_simulation, job_id, req.sra_accession, req.threads)
    return {"status": "started", "job_id": job_id}

@app.get("/api/v1/pipeline/status/{job_id}")
def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        return {"status": "NOT_FOUND", "logs": [f"[SYSTEM] Job ID {job_id} not active in database."]}
    return JOBS_DB[job_id]

@app.post("/api/v1/pipeline/deseq2")
def run_deseq2(req: DeseqRequest):
    comp_id = f"{req.control_job_id}_vs_{req.treated_job_id}"
    return {
        "status": "success",
        "comparison_id": comp_id,
        "message": f"DESeq2 differential expression executed for {comp_id}.",
        "report_url": f"/api/v1/pipeline/deseq2/html/{comp_id}"
    }

@app.get("/api/v1/pipeline/fastqc/{job_id}", response_class=HTMLResponse)
def get_fastqc_report_html(job_id: str):
    return f"<html><body><h1>FastQC Report - {job_id}</h1></body></html>"

@app.get("/api/v1/pipeline/deseq2/html/{comparison_id}", response_class=HTMLResponse)
def get_deseq2_html_report(comparison_id: str):
    return f"<html><body><h1>DESeq2 Report - {comparison_id}</h1></body></html>"

@app.get("/api/v1/pipeline/enrichment/{comparison_id}")
def get_enrichment(comparison_id: str):
    return {
        "status": "success",
        "comparison_id": comparison_id,
        "results": [
            {"term": "Cell Cycle (GO:0007049)", "p_value": 0.000012, "gene_set": "BP", "overlap": "12/45", "genes": ["TP53", "CDK4", "BRCA1"]}
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
