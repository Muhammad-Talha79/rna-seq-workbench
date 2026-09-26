from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
import pandas as pd
import sqlite3
from pathlib import Path

from app.services.enrichment import run_pathway_enrichment

router = APIRouter()

@router.get("/enrichment/{comparison_id}")
async def get_enrichment_analysis(comparison_id: str):
    db_paths = [
        Path("app.db"),
        Path("backend/app.db"),
        Path("data/app.db"),
        Path("backend/data/app.db")
    ]
    
    target_db = None
    for p in db_paths:
        if p.exists():
            target_db = p
            break

    if not target_db:
        raise HTTPException(status_code=404, detail="Database file app.db not found")

    try:
        conn = sqlite3.connect(str(target_db))
        query = "SELECT gene_id, log2_fold_change, padj FROM deseq2_results WHERE comparison_id = ?"
        deg_df = pd.read_sql_query(query, conn, params=(comparison_id,))
        conn.close()

        if deg_df.empty:
            return JSONResponse(
                content={"status": "no_results", "message": f"No DEGs found for comparison_id: {comparison_id}", "results": []},
                status_code=404
            )

        enrichment_data = run_pathway_enrichment(deg_df)
        return JSONResponse(content=enrichment_data)

    except Exception as e:
        return JSONResponse(
            content={"status": "error", "message": f"Enrichment calculation failed: {str(e)}", "results": []},
            status_code=500
        )
