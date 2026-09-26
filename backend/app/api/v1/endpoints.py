from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import uuid
import pandas as pd
import numpy as np

from app.config import settings
from app.schemas import (
    PipelineRunRequest, JobStatusResponse, CountResultsResponse,
    DESeq2AnalysisRequest, DESeq2Response
)
from app.services.pipeline import PipelineRunner
from app.services.deseq2_runner import DESeq2Runner
from app.services.log_streamer import LogStreamer
from app.database import get_db, SessionLocal
from app.models import PipelineJob, GeneCountResult, DifferentialExpressionResult

router = APIRouter(prefix="/pipeline", tags=["RNA-Seq Pipeline"])

def execute_pipeline_job_db(job_id: str, request: PipelineRunRequest):
    db: Session = SessionLocal()
    try:
        job = db.query(PipelineJob).filter(PipelineJob.job_id == job_id).first()
        if not job:
            return

        job.status = "ALIGNING"
        job.progress_percentage = 30
        job.current_step = "Aligning reads with HISAT2 & sorting BAM with samtools"
        db.commit()

        runner = PipelineRunner(job_id, request.sra_accession, request.threads)
        import asyncio
        asyncio.run(runner.run_alignment())

        job.status = "COUNTING"
        job.progress_percentage = 70
        job.current_step = "Quantifying exonic reads with featureCounts"
        db.commit()

        asyncio.run(runner.run_quantification())

        top_genes = runner.parse_top_expressed_genes(limit=5000)
        db_objs = [GeneCountResult(job_id=job_id, gene_id=g["gene_id"], count=g["count"]) for g in top_genes]
        db.bulk_save_objects(db_objs)

        job.status = "COMPLETED"
        job.progress_percentage = 100
        job.current_step = "Pipeline execution completed successfully"
        db.commit()

    except Exception as e:
        db.rollback()
        job = db.query(PipelineJob).filter(PipelineJob.job_id == job_id).first()
        if job:
            job.status = "FAILED"
            job.progress_percentage = 0
            job.current_step = "Pipeline execution failed"
            job.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/run", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_pipeline(payload: PipelineRunRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job_id = str(uuid.uuid4())[:8]
    
    db_job = PipelineJob(
        job_id=job_id,
        sra_accession=payload.sra_accession,
        status="QUEUED",
        progress_percentage=0,
        current_step="Job queued for execution"
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    background_tasks.add_task(execute_pipeline_job_db, job_id, payload)
    return db_job

@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PipelineJob).filter(PipelineJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job ID not found in database")
    return job

@router.get("/results/{job_id}", response_model=CountResultsResponse)
async def get_job_results(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PipelineJob).filter(PipelineJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job ID not found")
    
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Job results are not ready yet")
    
    runner = PipelineRunner(job_id, job.sra_accession)
    summary = runner.parse_counts_summary()
    
    genes_query = db.query(GeneCountResult).filter(GeneCountResult.job_id == job_id).order_by(GeneCountResult.count.desc()).limit(10).all()
    top_genes = [{"gene_id": g.gene_id, "count": g.count} for g in genes_query]
    
    return {
        "job_id": job_id,
        "sra_accession": job.sra_accession,
        "summary": summary,
        "top_expressed_genes": top_genes
    }

@router.websocket("/ws/logs/{job_id}")
async def stream_job_logs(websocket: WebSocket, job_id: str):
    await websocket.accept()
    streamer = LogStreamer(job_id)
    try:
        await streamer.stream_logs(websocket)
    except (WebSocketDisconnect, Exception):
        pass

@router.post("/deseq2", response_model=DESeq2Response)
async def run_deseq2_analysis(payload: DESeq2AnalysisRequest, db: Session = Depends(get_db)):
    comparison_id = str(uuid.uuid4())[:8]
    
    def fetch_job_counts(job_ids):
        counts = {}
        for jid in job_ids:
            records = db.query(GeneCountResult).filter(GeneCountResult.job_id == jid).all()
            if not records:
                counts_file = settings.DATA_DIR / jid / "03_counts" / "gene_counts.txt"
                if counts_file.exists():
                    df = pd.read_csv(counts_file, sep="\t", comment="#")
                    counts[jid] = dict(zip(df.iloc[:, 0], df.iloc[:, -1]))
                else:
                    raise HTTPException(status_code=400, detail=f"No gene counts found for job: {jid}")
            else:
                counts[jid] = {r.gene_id: r.count for r in records}
        return counts

    control_dict = fetch_job_counts(payload.control_job_ids)
    treated_dict = fetch_job_counts(payload.treated_job_ids)

    runner = DESeq2Runner(comparison_id)
    runner.prepare_input_matrices(control_dict, treated_dict)
    
    results_df = await runner.run_analysis()

    all_results = []
    db_records = []
    for gene_id, row in results_df.iterrows():
        lfc = float(row['log2FoldChange']) if pd.notna(row['log2FoldChange']) else 0.0
        pv = float(row['pvalue']) if pd.notna(row['pvalue']) else 1.0
        pa = float(row['padj']) if pd.notna(row['padj']) else 1.0
        bm = float(row['baseMean']) if pd.notna(row['baseMean']) else 0.0

        de_record = DifferentialExpressionResult(
            comparison_id=comparison_id,
            gene_id=str(gene_id),
            base_mean=bm,
            log2_fold_change=lfc,
            p_value=pv,
            padj=pa
        )
        db_records.append(de_record)
        
        all_results.append({
            "gene_id": str(gene_id),
            "base_mean": bm,
            "log2_fold_change": lfc,
            "p_value": pv,
            "padj": pa
        })

    db.bulk_save_objects(db_records)
    db.commit()

    return {
        "comparison_id": comparison_id,
        "total_genes_analyzed": len(results_df),
        "top_significant_genes": all_results
    }

@router.get("/deseq2/html/{comparison_id}", response_class=HTMLResponse)
async def get_volcano_html(comparison_id: str, db: Session = Depends(get_db)):
    try:
        records = db.query(DifferentialExpressionResult).filter(DifferentialExpressionResult.comparison_id == comparison_id).all()
        if not records:
            return HTMLResponse(content=f"<html><body style='background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:40px;'><h2>No records found for comparison_id: {comparison_id}</h2></body></html>", status_code=404)

        import plotly.graph_objects as go

        x_vals = [r.log2_fold_change for r in records]
        y_vals = [-np.log10(r.padj if (r.padj is not None and r.padj > 0) else 1e-10) for r in records]
        text_labels = [f"Gene: {r.gene_id}<br>Log2FC: {r.log2_fold_change:.2f}<br>-log10(padj): {y:.2f}" for r, y in zip(records, y_vals)]

        colors = []
        for r, y in zip(records, y_vals):
            lfc = r.log2_fold_change or 0.0
            if y > 1.3 and lfc >= 0.5:
                colors.append('#ef4444')
            elif y > 1.3 and lfc <= -0.5:
                colors.append('#3b82f6')
            else:
                colors.append('#64748b')

        fig = go.Figure(data=go.Scatter(
            x=x_vals,
            y=y_vals,
            mode='markers',
            text=text_labels,
            hoverinfo='text',
            marker=dict(size=7, color=colors, opacity=0.8)
        ))

        fig.update_layout(
            title=f"DESeq2 Differential Expression Volcano Plot (Comparison: {comparison_id})",
            template="plotly_dark",
            xaxis_title="log2(Fold Change)",
            yaxis_title="-log10(Adjusted P-Value)",
            autosize=True
        )

        return fig.to_html(include_plotlyjs='cdn')
    except Exception as e:
        return HTMLResponse(content=f"<html><body style='background:#0f172a;color:#ef4444;font-family:sans-serif;padding:40px;'><h2>Error generating Volcano Plot</h2><p>{str(e)}</p></body></html>", status_code=500)

@router.get("/fastqc/{job_id}", response_class=HTMLResponse)
async def get_fastqc_report(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PipelineJob).filter(PipelineJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job ID not found")

    qc_dir = settings.DATA_DIR / job_id / "01_fastqc"
    html_files = list(qc_dir.glob("*_fastqc.html"))

    if not html_files:
        return HTMLResponse(
            content=f"<html><body style='background:#0f172a;color:#94a3b8;font-family:sans-serif;padding:40px;text-align:center;'><h2>FastQC Report Pending or Unavailable</h2><p>Job ID: {job_id}</p></body></html>",
            status_code=404
        )

    with open(html_files[0], "r", encoding="utf-8") as f:
        html_content = f.read()

    # Prevent anchor links from escaping or crashing iframe contexts
    patch_head = """
    <head>
    <base target="_self">
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetEl = document.getElementById(targetId) || document.querySelector('[name="' + targetId + '"]');
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth' });
            }
          });
        });
      });
    </script>
    """
    html_content = html_content.replace("<head>", patch_head, 1)

    return HTMLResponse(content=html_content)
