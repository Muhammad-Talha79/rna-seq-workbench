import React, { useState } from 'react';
import DEGTable from './components/DEGTable';
import UMAPScatterPlot from './components/UMAPScatterPlot';

export default function App() {
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Pipeline State
  const [sraAccession, setSraAccession] = useState('SRR3734796');
  const [cpuThreads, setCpuThreads] = useState(4);
  const [jobId, setJobId] = useState('b0bd8a97');
  const [jobStatus, setJobStatus] = useState('COMPLETED');
  const [controlJobId, setControlJobId] = useState('3ce3a241');
  const [treatedJobId, setTreatedJobId] = useState('3ce3a241');
  const [terminalLogs, setTerminalLogs] = useState([
    '[SYSTEM] Established WebSocket stream for Job: b0bd8a97'
  ]);

  // Single-Cell State
  const [loadingScRna, setLoadingScRna] = useState(false);
  const [scRnaData, setScRnaData] = useState(null);

  // Mock DEGs for Table
  const sampleDegs = [
    { gene: "TP53", baseMean: 1240.5, log2FoldChange: 2.45, pvalue: 0.00001, padj: 0.00012 },
    { gene: "BRCA1", baseMean: 850.2, log2FoldChange: -1.82, pvalue: 0.00034, padj: 0.00210 },
    { gene: "EGFR", baseMean: 3100.8, log2FoldChange: 3.12, pvalue: 0.000001, padj: 0.000015 },
    { gene: "MYC", baseMean: 1950.4, log2FoldChange: -2.15, pvalue: 0.00012, padj: 0.00110 }
  ];

  const handleLaunchPipeline = async () => {
    setJobStatus('RUNNING');
    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sra_accession: sraAccession, threads: Number(cpuThreads) })
      });
      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
      }
    } catch (err) {
      console.error('Failed to trigger pipeline:', err);
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
    <div style={{ backgroundColor: '#0b1120', color: '#f8fafc', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      
      {/* Top Header & Navigation */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#ffffff' }}>
            RNA-Seq Transcriptomics Workbench
          </h1>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
            FastAPI + HISAT2 + DESeq2 + Scanpy Single-Cell Engine
          </p>
        </div>

        {/* Dashboard Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setActiveTab('pipeline')}
            style={{ padding: '8px 16px', background: activeTab === 'pipeline' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
          >
            Bulk Pipeline Launcher
          </button>
          <button 
            onClick={() => setActiveTab('degs')}
            style={{ padding: '8px 16px', background: activeTab === 'degs' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
          >
            DESeq2 DEG Visualizer
          </button>
          <button 
            onClick={() => setActiveTab('scrna')}
            style={{ padding: '8px 16px', background: activeTab === 'scrna' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
          >
            Single-Cell UMAP
          </button>
        </div>
      </header>

      {/* TAB 1: BULK PIPELINE LAUNCHER */}
      {activeTab === 'pipeline' && (
        <main>
          <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🗄️</span> SQLite Active
          </div>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#ffffff' }}>
              ❯ Launch Pipeline Run
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>SRA Accession</label>
                <input type="text" value={sraAccession} onChange={(e) => setSraAccession(e.target.value)} style={{ width: '130px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>CPU Threads</label>
                <input type="number" value={cpuThreads} onChange={(e) => setCpuThreads(e.target.value)} style={{ width: '130px' }} />
              </div>
              <button onClick={handleLaunchPipeline} style={{ padding: '4px 8px', marginTop: '4px', cursor: 'pointer' }}>
                Execute Alignment & Counts
              </button>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Job ID: {jobId}</div>
              <div style={{ fontSize: '13px' }}>Status: {jobStatus}</div>
              <button onClick={() => window.open(`http://localhost:8000/api/v1/pipeline/fastqc/${jobId}`, '_blank')} style={{ padding: '4px 8px', cursor: 'pointer', width: 'fit-content' }}>
                📋 Inspect FastQC Report
              </button>
            </div>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#ffffff' }}>
              ⚗ DESeq2 Differential Expression
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>Control Job ID</label>
                <input type="text" value={controlJobId} onChange={(e) => setControlJobId(e.target.value)} style={{ width: '130px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>Treated Job ID</label>
                <input type="text" value={treatedJobId} onChange={(e) => setTreatedJobId(e.target.value)} style={{ width: '130px' }} />
              </div>
            </div>
          </section>

          <div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ffffff', marginBottom: '4px' }}>
              LIVE TERMINAL STREAM :: {jobId}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8' }}>
              {terminalLogs.map((log, index) => (
                <div key={index}><span style={{ color: '#4ade80' }}>[SYSTEM]</span> {log.replace('[SYSTEM]', '').trim()}</div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: DESeq2 DEG TABLE */}
      {activeTab === 'degs' && (
        <main>
          <DEGTable degData={sampleDegs} />
        </main>
      )}

      {/* TAB 3: SINGLE-CELL UMAP */}
      {activeTab === 'scrna' && (
        <main>
          <div style={{ marginBottom: '16px' }}>
            <button 
              onClick={runScRnaPipeline}
              disabled={loadingScRna}
              style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              {loadingScRna ? 'Executing Scanpy Pipeline...' : 'Run Single-Cell Analysis'}
            </button>
          </div>
          <UMAPScatterPlot 
            umapData={scRnaData?.umap_coordinates || []} 
            clusters={scRnaData?.clusters || {}} 
            nCells={scRnaData?.n_cells} 
            nGenes={scRnaData?.n_genes} 
          />
        </main>
      )}

    </div>
  );
}
