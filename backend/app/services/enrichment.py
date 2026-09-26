import gseapy as gp
import pandas as pd
from typing import Dict, Any

def run_pathway_enrichment(deg_df: pd.DataFrame, organism: str = "Human") -> Dict[str, Any]:
    """
    Filters DEGs (|log2FC| >= 1.0, padj <= 0.05) and runs GSEAPy Enrichr
    against GO_Biological_Process_2023 and KEGG_2021_Human gene sets.
    """
    if deg_df.empty:
        return {"status": "no_data", "results": []}

    sig_genes = deg_df[
        (deg_df['padj'] <= 0.05) & 
        (deg_df['log2_fold_change'].abs() >= 1.0)
    ]['gene_id'].dropna().astype(str).tolist()

    if not sig_genes:
        return {"status": "no_sig_genes", "results": []}

    gene_sets = ['GO_Biological_Process_2023', 'KEGG_2021_Human']
    
    try:
        enr = gp.enrichr(
            gene_list=sig_genes,
            gene_sets=gene_sets,
            organism=organism,
            outdir=None
        )
        
        if enr.results is None or enr.results.empty:
            return {"status": "no_enrichment_found", "total_significant_degs": len(sig_genes), "results": []}

        df_res = enr.results
        df_sig = df_res.sort_values('Adjusted P-value').head(20)

        formatted_results = []
        for _, row in df_sig.iterrows():
            formatted_results.append({
                "gene_set": str(row.get('Gene_set', '')),
                "term": str(row.get('Term', '')),
                "overlap": str(row.get('Overlap', '')),
                "p_value": float(row.get('P-value', 1.0)),
                "adjusted_p_value": float(row.get('Adjusted P-value', 1.0)),
                "genes": row.get('Genes', '').split(';') if isinstance(row.get('Genes'), str) else []
            })

        return {
            "status": "success",
            "total_significant_degs": len(sig_genes),
            "results": formatted_results
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "results": []}
