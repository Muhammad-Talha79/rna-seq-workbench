import gseapy as gp
import pandas as pd
from typing import Dict, List, Any

def run_pathway_enrichment(deg_df: pd.DataFrame, organism: str = "Human") -> Dict[str, Any]:
    """
    Filters DEGs (|log2FC| >= 1.0, padj <= 0.05) and runs GSEAPy Enrichr
    against GO_Biological_Process_2023 and KEGG_2021_Human gene sets.
    """
    # Filter significant DEGs
    sig_genes = deg_df[
        (deg_df['padj'] <= 0.05) & 
        (deg_df['log2_fold_change'].abs() >= 1.0)
    ]['gene_id'].dropna().tolist()

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
        
        df_res = enr.results
        # Filter terms with Adjusted P-value <= 0.05
        df_sig = df_res[df_res['Adjusted P-value'] <= 0.05].copy()
        df_sig = df_sig.sort_values('Adjusted P-value').head(20)

        formatted_results = []
        for _, row in df_sig.iterrows():
            formatted_results.append({
                "gene_set": row['Gene_set'],
                "term": row['Term'],
                "overlap": row['Overlap'],
                "p_value": float(row['P-value']),
                "adjusted_p_value": float(row['Adjusted P-value']),
                "genes": row['Genes'].split(';') if isinstance(row['Genes'], str) else []
            })

        return {
            "status": "success",
            "total_significant_degs": len(sig_genes),
            "results": formatted_results
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "results": []}
