import React, { useState } from 'react';
import { Activity, Play, Cpu, Layers } from 'lucide-react';
import DEGTable from './components/DEGTable';
import UMAPScatterPlot from './components/UMAPScatterPlot';

export default function App() {
  const [loadingScRna, setLoadingScRna] = useState(false);
  const [scRnaData, setScRnaData] = useState(null);

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
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">RNA-seq Workbench</h1>
            <p className="text-xs text-slate-400">Production Bioinformatics Processing & Single-Cell Analysis</p>
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
        {scRnaData && (
          <UMAPScatterPlot
            umapData={scRnaData.umap_coordinates}
            clusters={scRnaData.clusters}
            nCells={scRnaData.n_cells}
            nGenes={scRnaData.n_genes}
          />
        )}

        <section>
          <DEGTable degData={[]} />
        </section>
      </main>
    </div>
  );
}
