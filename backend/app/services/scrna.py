import scanpy as sc
import anndata as ad
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any

def run_scrna_pipeline(h5_path: str = None) -> Dict[str, Any]:
    """
    Executes a standard Scanpy single-cell RNA-seq pipeline:
    Quality control filtering, normalization, log1p transformation, 
    highly variable gene selection, PCA, neighbors, UMAP, and Leiden clustering.
    """
    try:
        if h5_path and Path(h5_path).exists():
            adata = sc.read_10x_h5(h5_path)
        else:
            # Fallback to Scanpy built-in pbmc3k dataset for robust testing
            adata = sc.datasets.pbmc3k()
        
        # Ensure unique gene names
        adata.var_names_make_unique()

        # Mitochondrial QC metrics
        adata.var['mt'] = adata.var_names.str.startswith('MT-')
        sc.pp.calculate_qc_metrics(adata, qc_vars=['mt'], percent_top=None, inplace=True)
        
        # Cell and gene filtering
        sc.pp.filter_cells(adata, min_genes=200)
        sc.pp.filter_genes(adata, min_cells=3)
        if 'pct_counts_mt' in adata.obs.columns:
            adata = adata[adata.obs.pct_counts_mt < 5, :].copy()
        
        # Normalization and Log transformation
        sc.pp.normalize_total(adata, target_sum=1e4)
        sc.pp.log1p(adata)
        
        # Highly variable genes
        sc.pp.highly_variable_genes(adata, min_mean=0.012, max_mean=3, min_disp=0.5)
        adata = adata[:, adata.var.highly_variable].copy()
        
        # Dimensionality Reduction & Clustering
        sc.pp.scale(adata, max_value=10)
        sc.tl.pca(adata, svd_solver='arpack')
        sc.pp.neighbors(adata, n_neighbors=10, n_pcs=30)
        sc.tl.umap(adata)
        sc.tl.leiden(adata, resolution=0.6)
        
        # Summarize cluster statistics
        cluster_counts = adata.obs['leiden'].value_counts().to_dict()
        
        return {
            "status": "success",
            "n_cells": int(adata.n_obs),
            "n_genes": int(adata.n_vars),
            "clusters": {str(k): int(v) for k, v in cluster_counts.items()},
            "message": "Scanpy scRNA-seq pipeline successfully executed."
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "clusters": {}}
