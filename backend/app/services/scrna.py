import scanpy as sc
import pandas as pd
import warnings
from pathlib import Path
from typing import Dict, Any

# Suppress pandas/anndata future warnings
warnings.filterwarnings('ignore')

def run_scrna_pipeline(h5_path: str = None) -> Dict[str, Any]:
    try:
        if h5_path and Path(h5_path).exists():
            adata = sc.read_10x_h5(h5_path)
        else:
            adata = sc.datasets.pbmc3k()
        
        adata.var_names_make_unique()
        
        # Subsample for rapid execution
        if adata.n_obs > 500:
            sc.pp.subsample(adata, n_obs=500)

        # QC and filtering
        sc.pp.filter_cells(adata, min_genes=100)
        sc.pp.filter_genes(adata, min_cells=3)
        
        # Normalization and log transformation
        sc.pp.normalize_total(adata, target_sum=1e4)
        sc.pp.log1p(adata)
        
        # Highly variable genes & PCA (using correct argument: n_top_genes)
        sc.pp.highly_variable_genes(adata, n_top_genes=1000)
        adata = adata[:, adata.var.highly_variable].copy()
        sc.tl.pca(adata, svd_solver='arpack')
        
        # Graph construction and clustering
        sc.pp.neighbors(adata, n_neighbors=10, n_pcs=15)
        sc.tl.umap(adata)
        
        try:
            sc.tl.leiden(adata, resolution=0.5)
            cluster_col = 'leiden'
        except Exception:
            sc.tl.louvain(adata, resolution=0.5)
            cluster_col = 'louvain'
        
        cluster_counts = adata.obs[cluster_col].value_counts().to_dict()
        
        # Extract 2D UMAP coordinates for frontend scatter plots
        umap_coords = []
        for i in range(min(100, len(adata))):
            umap_coords.append({
                "cell_id": str(adata.obs_names[i]),
                "x": float(adata.obsm['X_umap'][i, 0]),
                "y": float(adata.obsm['X_umap'][i, 1]),
                "cluster": str(adata.obs[cluster_col].iloc[i])
            })

        return {
            "status": "success",
            "n_cells": int(adata.n_obs),
            "n_genes": int(adata.n_vars),
            "clusters": {str(k): int(v) for k, v in cluster_counts.items()},
            "umap_coordinates": umap_coords,
            "message": "Scanpy scRNA-seq pipeline executed successfully."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Scanpy execution failed: {str(e)}",
            "clusters": {},
            "umap_coordinates": []
        }
