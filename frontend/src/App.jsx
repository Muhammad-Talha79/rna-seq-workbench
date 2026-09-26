import React, { useState, useEffect } from 'react';
import { Activity, Play, Cpu, BarChart2, Database, Download, FileText, CheckCircle } from 'lucide-react';
import DEGTable from './components/DEGTable';
import UMAPScatterPlot from './components/UMAPScatterPlot';

export default function App() {
  const [loadingScRna, setLoadingScRna] = useState(false);
  const [scRnaData, setScRnaData] = useState(null);
  const [degData, setDegData] = useState([]);
  const [enrichmentData, setEnrichmentData] = useState([]);
  const [comparisonId, setComparisonId] = useState('test_comp_1');
  const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' or 'scrna'

  // Sample bulk DEGs mock data for initial load if backend job is pending
  const initialBulkDegs = [
    { gene: "TP53", baseMean: 1240.5, log2FoldChange: 2.45, pvalue: 0.00001, padj: 0.00012 },
    { gene: "BRCA1", baseMean: 850.2, log2FoldChange: -1.82, pvalue: 0.00034, padj: 0.00210 },
    { gene: "EGFR", baseMean: 3100.8, log2FoldChange: 3.12, pvalue: 0.000001, padj: 0.000015 },
    { gene: "MYC", baseMean: 1950.4, log2FoldChange: -2.15, pvalue: 0.00012, padj: 0.00110 },
    { gene: "VEGFA", baseMean: 1420.1, log2FoldChange: 1.95, pvalue: 0.00022, padj: 0.00180 }
  ];

  useEffect(() => {
    setDegData(initialBulkDegs);
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
      setActiveTab('scrna');
    } catch (err) {
      console.error('Failed to trigger scRNA-seq processing:', err);
    } finally {
      setLoadingScRna(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Workbench Navigation Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">RNA-seq Workbench</h1>
            <p className="text-xs text-slate-400">Integrated Bulk DESeq2 & Single-Cell Scanpy Analysis</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'bulk' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bulk RNA-seq Dashboard
          </button>
          <button
            onClick={() => setActiveTab('scrna')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'scrna' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Single-Cell (scRNA-seq)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runScRnaPipeline}
            disabled={loadingScRna}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg disabled:opacity-50 transition-all"
          >
            {loadingScRna ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loadingScRna ? 'Processing scRNA-seq...' : 'Run scRNA-seq Engine'}
          </button>
        </div>
      </header>

      <main className="space-y-6">
        {/* Bulk RNA-seq Dashboard View */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">DESeq2 Status</p>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-4 h-4" /> Analyzed (Comp 1)
                  </p>
                </div>
                <Database className="w-6 h-6 text-slate-600" />
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">Quality Control</p>
                  <a
                    href="http://localhost:8000/api/v1/pipeline/deseq2/html/test_comp_1"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-1 font-medium"
                  >
                    <FileText className="w-4 h-4" /> View MultiQC Report
                  </a>
                </div>
                <BarChart2 className="w-6 h-6 text-slate-600" />
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400">Pathways Enriched</p>
                  <p className="text-sm font-semibold text-white mt-1">GSEAPy GO / KEGG</p>
                </div>
                <Activity className="w-6 h-6 text-slate-600" />
              </div>
            </div>

            {/* Pathway Enrichment Cards */}
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive DEG Filtering Table */}
            <DEGTable degData={degData} />
          </div>
        )}

        {/* Single-Cell View */}
        {activeTab === 'scrna' && (
          <div className="space-y-6">
            <UMAPScatterPlot
              umapData={scRnaData?.umap_coordinates || []}
              clusters={scRnaData?.clusters || {}}
              nCells={scRnaData?.n_cells}
              nGenes={scRnaData?.n_genes}
            />
          </div>
        )}
      </main>
    </div>
  );
}
