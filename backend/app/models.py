from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PipelineJob(Base):
    __tablename__ = "pipeline_jobs"

    job_id = Column(String, primary_key=True, index=True)
    sra_accession = Column(String, nullable=False, default="SRR3734796")
    status = Column(String, nullable=False, default="QUEUED")
    progress_percentage = Column(Integer, default=0)
    current_step = Column(String, default="Job queued")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    gene_counts = relationship("GeneCountResult", back_populates="job", cascade="all, delete-orphan")

class GeneCountResult(Base):
    __tablename__ = "gene_count_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("pipeline_jobs.job_id"), nullable=False)
    gene_id = Column(String, nullable=False, index=True)
    count = Column(Integer, nullable=False)

    job = relationship("PipelineJob", back_populates="gene_counts")

class DifferentialExpressionResult(Base):
    __tablename__ = "differential_expression_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    comparison_id = Column(String, nullable=False, index=True)
    gene_id = Column(String, nullable=False, index=True)
    base_mean = Column(Float, nullable=True)
    log2_fold_change = Column(Float, nullable=True)
    lfc_se = Column(Float, nullable=True)
    p_value = Column(Float, nullable=True)
    padj = Column(Float, nullable=True)
