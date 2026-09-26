from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class PipelineRunRequest(BaseModel):
    sra_accession: str = Field("SRR3734796", description="SRA accession number to process")
    threads: int = Field(4, ge=1, le=16, description="Number of CPU threads")

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress_percentage: int
    current_step: str
    error_message: Optional[str] = None

class GeneCountItem(BaseModel):
    gene_id: str
    count: int

class CountResultsResponse(BaseModel):
    job_id: str
    sra_accession: str
    summary: Dict[str, int]
    top_expressed_genes: List[GeneCountItem]

class DESeq2AnalysisRequest(BaseModel):
    control_job_ids: List[str] = Field(..., description="List of job IDs assigned to Control group")
    treated_job_ids: List[str] = Field(..., description="List of job IDs assigned to Treated group")

class DEResultItem(BaseModel):
    gene_id: str
    base_mean: Optional[float]
    log2_fold_change: Optional[float]
    p_value: Optional[float]
    padj: Optional[float]

class DESeq2Response(BaseModel):
    comparison_id: str
    total_genes_analyzed: int
    top_significant_genes: List[DEResultItem]
