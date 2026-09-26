import React, { useState, useEffect } from 'react';
import { Activity, Play, Cpu, BarChart2, Database, Download } from 'lucide-react';
import DEGTable from './components/DEGTable';
import UMAPScatterPlot from './components/UMAPScatterPlot';

export default function App() {
  const [loadingScRna, setLoadingScRna] = useState(false);
  const [scRnaData, setScRnaData] = useState(null);
  const [degData, setDegData] = useState([]);
  const [enrichmentData, setEnrichmentData] = useState([]);
  const [comparisonId, setComparisonId] = useState('test_comp_1');

  // Load DEGs and Enrichment for the active comparison ID
  useEffect(() => {
    fetchEnrichment(comparisonId);
  }, [comparisonId]);

  const fetchEnrichment = async (compId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/pipeline/enrichment/${compId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setEnrichmentData(data.results || []);
      }
    } catch (err) {
      console.error('Failed to load pathway enrichment:', err);
    }
  };

  const runScRnaPipeline = async () => {
    setLoadingScRna(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/scrna/analyze', {
        method: 'POST',
      });
      const data = await res.json();
      setScRnaData(data);
    } catch (err) {
      console.error('Failed to trigger scRNA-seq processing:', err);
    } finally {
      setLoadingScRna(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Header Navigation */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">RNA-seq Workbench</h1>
            <p className="text-xs text-slate-400">Bulk & Single-Cell Transcriptomics Analysis Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runScRnaPipeline}
            disabled={loadingScRna}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg disabled:opacity-50 transition-all"
          >
            {loadingScRna ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loadingScRna ? 'Processing scRNA-seq...' : 'Run scRNA-seq Pipeline'}
          </button>
        </div>
      </header>

      <main className="space-y-6">
        {/* 1. Single-Cell UMAP Module */}
        {scRnaData && (
          <UMAPScatterPlot
            umapData={scRnaData.umap_coordinates}
            clusters={scRnaData.clusters}
            nCells={scRnaData.n_cells}
            nGenes={scRnaData.n_genes}
          />
        )}

        {/* 2. GO/KEGG Pathway Enrichment Summary */}
        {enrichmentData.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-cyan-400" /> Enriched Pathways (GSEAPy)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {enrichmentData.slice(0, 4).map((item, idx) => (
                <div key={idx} className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span className="text-cyan-300">{item.term}</span>
                    <span className="font-mono text-slate-400">p = {item.p_value.toExponential(2)}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Set: {item.gene_set} | Overlap: {item.overlap}
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono truncate">
                    Genes: {item.genes.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Differential Expression Data Table */}
        <section>
          <DEGTable degData={degData} />
        </section>
      </main>
    </div>
  );
}
