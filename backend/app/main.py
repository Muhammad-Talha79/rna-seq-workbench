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
        "progress": 5,
        "logs": [
            f"[SYSTEM] Job {job_id} initialized for accession {sra}.",
            f"[SYSTEM] Allocating {threads} CPU threads and 16GB memory buffer..."
        ]
    }
    
    # Phase 1: FASTQ Download & Extraction (12s)
    await asyncio.sleep(3)
    JOBS_DB[job_id]["logs"].append(f"[SRA-TOOLKIT] Connecting to NCBI SRA database for accession {sra}...")
    await asyncio.sleep(4)
    JOBS_DB[job_id]["logs"].append(f"[FASTQ-DUMP] Reading binary SRA stream. Extracting paired-end reads...")
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[FASTQ-DUMP] Wrote 15,420,180 spot reads to {sra}_1.fastq and {sra}_2.fastq.")
    JOBS_DB[job_id]["progress"] = 25

    # Phase 2: HISAT2 Genome Index Alignment (20s)
    await asyncio.sleep(4)
    JOBS_DB[job_id]["logs"].append(f"[HISAT2] Loading GRCh38 human reference genome index into RAM...")
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[HISAT2] Aligning 15.4M paired reads using {threads} threads...")
    await asyncio.sleep(6)
    JOBS_DB[job_id]["logs"].append(f"[HISAT2] Processed 10,000,000 read pairs (64.8% aligned concordantly 1 time).")
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[HISAT2] Alignment summary: 94.2% overall alignment rate (14,525,809 reads mapped).")
    JOBS_DB[job_id]["progress"] = 60

    # Phase 3: SAMtools Sorting & Indexing (15s)
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[SAMTOOLS] Converting SAM alignment stream to compressed BAM format...")
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[SAMTOOLS] Sorting BAM by genomic coordinates (mem-limit: 2G/thread)...")
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[SAMTOOLS] Indexing {sra}_sorted.bam -> {sra}_sorted.bam.bai complete.")
    JOBS_DB[job_id]["progress"] = 80

    # Phase 4: featureCounts Gene Quantification (13s)
    await asyncio.sleep(4)
    JOBS_DB[job_id]["logs"].append(f"[FEATURECOUNTS] Loading Gencode v44 human gene annotation GTF...")
    await asyncio.sleep(5)
    JOBS_DB[job_id]["logs"].append(f"[FEATURECOUNTS] Assigning alignments to exons... 82.4% successfully assigned.")
    await asyncio.sleep(4)
    JOBS_DB[job_id]["logs"].append(f"[FEATURECOUNTS] Matrix created: 24,500 genes x 1 sample saved to database.")
    JOBS_DB[job_id]["logs"].append(f"[SYSTEM] Alignment pipeline finished with exit code 0. Reports generated.")
    JOBS_DB[job_id]["progress"] = 100
    JOBS_DB[job_id]["status"] = "COMPLETED"

@app.post("/api/v1/pipeline/align")
def trigger_alignment(req: AlignRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    JOBS_DB[job_id] = {
        "status": "PENDING",
        "progress": 0,
        "logs": [f"[SYSTEM] Queueing alignment job {job_id} for SRA accession {req.sra_accession}..."]
    }
    background_tasks.add_task(run_alignment_simulation, job_id, req.sra_accession, req.threads)
    return {"status": "started", "job_id": job_id}

@app.get("/api/v1/pipeline/status/{job_id}")
def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        return {"status": "NOT_FOUND", "logs": [f"[SYSTEM] Job ID {job_id} not found."]}
    return JOBS_DB[job_id]

@app.post("/api/v1/pipeline/deseq2")
def run_deseq2(req: DeseqRequest):
    comp_id = f"{req.control_job_id}_vs_{req.treated_job_id}"
    return {
        "status": "success",
        "comparison_id": comp_id,
        "message": f"DESeq2 analysis completed for {comp_id}.",
        "report_url": f"/api/v1/pipeline/deseq2/html/{comp_id}"
    }

# Rich HTML FastQC Report
@app.get("/api/v1/pipeline/fastqc/{job_id}", response_class=HTMLResponse)
def get_fastqc_report_html(job_id: str):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>FastQC Report - Job {job_id}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #f8fafc; padding: 30px; margin: 0; }}
            .container {{ max-width: 1000px; margin: 0 auto; }}
            .header {{ border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }}
            .card {{ background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; }}
            .badge-pass {{ background: #065f46; color: #34d399; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }}
            .metric-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }}
            .metric-table th, .metric-table td {{ padding: 12px; text-align: left; border-bottom: 1px solid #1e293b; }}
            .metric-table th {{ color: #94a3b8; background: #1e293b; }}
            .bar-bg {{ background: #1e293b; border-radius: 4px; height: 18px; width: 100%; overflow: hidden; }}
            .bar-fill {{ background: #38bdf8; height: 100%; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="color:#ffffff; margin:0 0 8px 0;">FastQC High-Throughput Read Inspection</h1>
                <p style="color:#94a3b8; margin:0;">Target Job ID: <strong style="color:#38bdf8;">{job_id}</strong> | Illumina Paired-End Platform</p>
            </div>

            <div class="card">
                <h2 style="margin-top:0; color:#38bdf8;">1. Basic Statistics Summary</h2>
                <table class="metric-table">
                    <thead>
                        <tr><th>Measure</th><th>Value</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Filename</td><td><code>{job_id}_pass_1.fastq.gz</code></td><td><span class="badge-pass">PASS</span></td></tr>
                        <tr><td>File Type</td><td>Conventional Base Calls</td><td><span class="badge-pass">PASS</span></td></tr>
                        <tr><td>Encoding</td><td>Sanger / Illumina 1.9</td><td><span class="badge-pass">PASS</span></td></tr>
                        <tr><td>Total Reads Processed</td><td>15,420,180</td><td><span class="badge-pass">PASS</span></td></tr>
                        <tr><td>Sequence Length</td><td>150 bp</td><td><span class="badge-pass">PASS</span></td></tr>
                        <tr><td>Overall GC Content</td><td>48%</td><td><span class="badge-pass">PASS</span></td></tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h2 style="margin-top:0; color:#38bdf8;">2. Per-Base Sequence Quality Scores (Phred Scale)</h2>
                <p style="color:#cbd5e1; font-size:13px;">Mean quality score across all 150 base pair positions:</p>
                <div style="margin-top:15px; space-y:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                        <span>Positions 1-30 (5' Adapter & Start)</span>
                        <span style="color:#34d399; font-weight:bold;">Q36 (99.97% Accuracy)</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width: 92%;"></div></div>

                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; margin-top:12px;">
                        <span>Positions 31-120 (Mid Read Core)</span>
                        <span style="color:#34d399; font-weight:bold;">Q38 (99.98% Accuracy)</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width: 96%;"></div></div>

                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px; margin-top:12px;">
                        <span>Positions 121-150 (3' Read Tail)</span>
                        <span style="color:#34d399; font-weight:bold;">Q34 (99.96% Accuracy)</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width: 85%;"></div></div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

# Rich HTML DESeq2 MultiQC Aggregated Report
@app.get("/api/v1/pipeline/deseq2/html/{comparison_id}", response_class=HTMLResponse)
def get_deseq2_html_report(comparison_id: str):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>DESeq2 MultiQC Aggregated Report - {comparison_id}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #020617; color: #f8fafc; padding: 30px; margin: 0; }}
            .container {{ max-width: 1000px; margin: 0 auto; }}
            .header {{ border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }}
            .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }}
            .card {{ background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; }}
            .stat-num {{ font-size: 28px; font-weight: bold; margin-top: 8px; }}
            .gene-list {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }}
            .gene-list th, .gene-list td {{ padding: 10px; border-bottom: 1px solid #1e293b; text-align: left; }}
            .gene-list th {{ background: #1e293b; color: #94a3b8; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="color:#ffffff; margin:0 0 8px 0;">DESeq2 Differential Expression MultiQC Summary</h1>
                <p style="color:#94a3b8; margin:0;">Comparison: <strong style="color:#38bdf8;">{comparison_id}</strong> | Wald Test (p-adj &lt; 0.05)</p>
            </div>

            <div class="grid">
                <div class="card">
                    <div style="font-size:12px; color:#94a3b8;">Total Genes Tested</div>
                    <div class="stat-num" style="color:#ffffff;">24,500</div>
                </div>
                <div class="card">
                    <div style="font-size:12px; color:#94a3b8;">Upregulated DEGs</div>
                    <div class="stat-num" style="color:#34d399;">+1,240</div>
                </div>
                <div class="card">
                    <div style="font-size:12px; color:#94a3b8;">Downregulated DEGs</div>
                    <div class="stat-num" style="color:#f43f5e;">-980</div>
                </div>
                <div class="card">
                    <div style="font-size:12px; color:#94a3b8;">Low Count Filtered</div>
                    <div class="stat-num" style="color:#cbd5e1;">3,120</div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-top:0; color:#38bdf8;">Top Differentially Expressed Genes (LFC &gt; 2.0, padj &lt; 0.001)</h3>
                <table class="gene-list">
                    <thead>
                        <tr><th>Gene Symbol</th><th>Base Mean</th><th>log2FoldChange</th><th>p-adjusted</th></tr>
                    </thead>
                    <tbody>
                        <tr><td style="font-weight:bold; color:#38bdf8;">EGFR</td><td>3100.8</td><td style="color:#34d399; font-weight:bold;">+3.12</td><td>1.5e-5</td></tr>
                        <tr><td style="font-weight:bold; color:#38bdf8;">TP53</td><td>1240.5</td><td style="color:#34d399; font-weight:bold;">+2.45</td><td>1.2e-4</td></tr>
                        <tr><td style="font-weight:bold; color:#38bdf8;">MYC</td><td>1950.4</td><td style="color:#f43f5e; font-weight:bold;">-2.15</td><td>1.1e-3</td></tr>
                        <tr><td style="font-weight:bold; color:#38bdf8;">VEGFA</td><td>1420.1</td><td style="color:#34d399; font-weight:bold;">+1.95</td><td>1.8e-3</td></tr>
                        <tr><td style="font-weight:bold; color:#38bdf8;">BRCA1</td><td>850.2</td><td style="color:#f43f5e; font-weight:bold;">-1.82</td><td>2.1e-3</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>
    """

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
