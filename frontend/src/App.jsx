import React, { useState } from 'react';
import axios from 'axios';
import { Play, Activity, Database, BarChart3, FlaskConical, FileCheck, X, ExternalLink } from 'lucide-react';
import TerminalLogs from './components/TerminalLogs';
import VolcanoPlot from './components/VolcanoPlot';

const API_BASE = 'http://localhost:8000/api/v1/pipeline';

export default function App() {
  const [sraAccession, setSraAccession] = useState('SRR3734796');
  const [threads, setThreads] = useState(4);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [deResults, setDeResults] = useState([]);
  const [comparisonId, setComparisonId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQcModal, setShowQcModal] = useState(false);

  const [controlJob, setControlJob] = useState('3ce3a241');
  const [treatedJob, setTreatedJob] = useState('3ce3a241');

  const triggerRun = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/run`, {
        sra_accession: sraAccession,
        threads: Number(threads)
      });
      setActiveJobId(res.data.job_id);
      setJobStatus(res.data);
      pollStatus(res.data.job_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/status/${jobId}`);
        setJobStatus(res.data);
        if (res.data.status === 'COMPLETED') {
          clearInterval(interval);
          fetchResults(jobId);
        } else if (res.data.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 3000);
  };

  const fetchResults = async (jobId) => {
    try {
      const res = await axios.get(`${API_BASE}/results/${jobId}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const runDESeq2 = async () => {
    try {
      const res = await axios.post(`${API_BASE}/deseq2`, {
        control_job_ids: [controlJob],
        treated_job_ids: [treatedJob]
      });
      const normalized = (res.data.top_significant_genes || []).map(g => ({
        gene_id: g.gene_id,
        log2_fold_change: g.log2_fold_change ?? g.log2FoldChange ?? 0,
        p_value: g.p_value ?? g.pvalue ?? 1.0,
        padj: g.padj ?? 1.0
      }));
      setDeResults(normalized);
      setComparisonId(res.data.comparison_id);
    } catch (err) {
      alert(`DESeq2 Error: ${err.response?.data?.detail || "Error triggering analysis."}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="flex items-center justify-between pb-6 mb-8 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-400" /> RNA-Seq Transcriptomics Workbench
          </h1>
          <p className="text-xs text-slate-400 mt-1">FastAPI + HISAT2 + featureCounts + DESeq2 Stack</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Database className="w-4 h-4 text-emerald-400" /> SQLite Active
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-sky-400" /> Launch Pipeline Run
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">SRA Accession</label>
                <input type="text" value={sraAccession} onChange={(e) => setSraAccession(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">CPU Threads</label>
                <input type="number" value={threads} onChange={(e) => setThreads(e.target.value)} min="1" max="16" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono" />
              </div>
              <button onClick={triggerRun} disabled={loading} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2.5 rounded-lg transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 disabled:opacity-50">
                {loading ? 'Initializing...' : 'Execute Alignment & Counts'}
              </button>
            </div>
            {jobStatus && (
              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Job ID:</span>
                  <span className="font-mono text-slate-200">{jobStatus.job_id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-sky-400">{jobStatus.status}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                  <div className="bg-sky-500 h-2 transition-all duration-500" style={{ width: `${jobStatus.progress_percentage}%` }} />
                </div>
                {activeJobId && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowQcModal(true)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> Inspect Report
                    </button>
                    <a
                      href={`http://localhost:8000/api/v1/pipeline/fastqc/${activeJobId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 transition-all flex items-center justify-center"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-400" /> DESeq2 Differential Expression
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Control Job ID</label>
                <input type="text" value={controlJob} onChange={(e) => setControlJob(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Treated Job ID</label>
                <input type="text" value={treatedJob} onChange={(e) => setTreatedJob(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500" />
              </div>
              <button onClick={runDESeq2} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-lg text-xs mt-2 transition-all shadow-lg shadow-purple-600/20">
                Run Differential Expression
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {activeJobId ? <TerminalLogs jobId={activeJobId} /> : <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">No active pipeline run. Launch a job above to view live execution logs.</div>}
          
          {results && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> featureCounts Summary
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                  <span className="text-xs text-slate-400">Assigned Reads</span>
                  <p className="text-lg font-bold font-mono text-emerald-400 mt-1">{results.summary.Assigned?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                  <span className="text-xs text-slate-400">Unassigned (Unmapped)</span>
                  <p className="text-lg font-bold font-mono text-amber-400 mt-1">{results.summary.Unassigned_Unmapped?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                  <span className="text-xs text-slate-400">No Features</span>
                  <p className="text-lg font-bold font-mono text-slate-400 mt-1">{results.summary.Unassigned_NoFeatures?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <VolcanoPlot deResults={deResults} comparisonId={comparisonId} />
        </div>
      </div>

      {showQcModal && activeJobId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-sky-400" /> FastQC Quality Control Report (Job: {activeJobId})
              </h3>
              <button onClick={() => setShowQcModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={`http://localhost:8000/api/v1/pipeline/fastqc/${activeJobId}`}
              className="w-full h-full border-0 bg-white"
              title="FastQC Report"
            />
          </div>
        </div>
      )}
    </div>
  );
}
