import React, { useState, useEffect, useRef } from 'react';
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
  const [deseqStatus, setDeseqStatus] = useState('IDLE');
  
  const [terminalLogs, setTerminalLogs] = useState([
    '[SYSTEM] Established WebSocket stream for Job: b0bd8a97',
    '[HISAT2] Aligning reads against GRCh38 human reference index...',
    '[SAMTOOLS] Sorting and indexing BAM files...',
    '[FEATURECOUNTS] Assigning reads to gene annotations (GTF)...',
    '[SYSTEM] Alignment pipeline finished with exit code 0.'
  ]);

  // Single-Cell State
  const [loadingScRna, setLoadingScRna] = useState(false);
  const [scRnaData, setScRnaData] = useState(null);

  const handleLaunchPipeline = async () => {
    setJobStatus('RUNNING');
    setTerminalLogs(prev => [...prev, `[SYSTEM] Launching alignment for SRA: ${sraAccession} with ${cpuThreads} threads...`]);
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sra_accession: sraAccession, threads: Number(cpuThreads) })
      });
      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
        setJobStatus('COMPLETED');
        setTerminalLogs(prev => [...prev, `[SYSTEM] Job ${data.job_id} completed successfully.`]);
      }
    } catch (err) {
      setJobStatus('FAILED');
      setTerminalLogs(prev => [...prev, `[ERROR] Failed to execute alignment pipeline.`]);
    }
  };

  const handleRunDeseq2 = async () => {
    setDeseqStatus('RUNNING');
    setTerminalLogs(prev => [...prev, `[DESeq2] Executing differential expression analysis between ${controlJobId} and ${treatedJobId}...`]);
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/deseq2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ control_job_id: controlJobId, treated_job_id: treatedJobId })
      });
      if (res.ok) {
        setDeseqStatus('COMPLETED');
        setTerminalLogs(prev => [...prev, `[DESeq2] Differential expression complete. MultiQC report updated.`]);
      }
    } catch (err) {
      setDeseqStatus('FAILED');
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
      
      {/* Top Header & View Switcher */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#ffffff' }}>
            RNA-Seq Transcriptomics Workbench
          </h1>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
            FastAPI + HISAT2 + featureCounts + DESeq2 + Scanpy Engine
          </p>
        </div>

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

          {/* Alignment Pipeline Controls */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#ffffff' }}>
              ❯ Launch Pipeline Run
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', color: '#f8fafc' }}>SRA Accession</label>
                <input 
                  type="text" 
                  value={sraAccession} 
                  onChange={(e) => setSraAccession(e.target.value)}
                  style={{ backgroundColor: '#ffffff', color: '#000000', padding: '3px 8px', border: '1px solid #ccc', borderRadius: '3px', width: '150px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', color: '#f8fafc' }}>CPU Threads</label>
                <input 
                  type="number" 
                  value={cpuThreads} 
                  onChange={(e) => setCpuThreads(e.target.value)}
                  style={{ backgroundColor: '#ffffff', color: '#000000', padding: '3px 8px', border: '1px solid #ccc', borderRadius: '3px', width: '150px', fontSize: '13px' }}
                />
              </div>

              <button 
                onClick={handleLaunchPipeline}
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', textAlign: 'left', width: 'fit-content', marginTop: '4px' }}
              >
                Execute Alignment & Counts
              </button>

              <div style={{ fontSize: '13px', marginTop: '4px' }}>Job ID: <b>{jobId}</b></div>
              <div style={{ fontSize: '13px' }}>Status: <span style={{ color: jobStatus === 'COMPLETED' ? '#4ade80' : '#facc15', fontWeight: 'bold' }}>{jobStatus}</span></div>

              <button 
                onClick={() => window.open(`http://localhost:8000/api/v1/pipeline/fastqc/${jobId}`, '_blank')}
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', marginTop: '4px' }}
              >
                <span>📋</span> Inspect FastQC Report
              </button>
            </div>
          </section>

          {/* DESeq2 Controls */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#ffffff' }}>
              ⚗ DESeq2 Differential Expression
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', color: '#f8fafc' }}>Control Job ID</label>
                <input 
                  type="text" 
                  value={controlJobId} 
                  onChange={(e) => setControlJobId(e.target.value)}
                  style={{ backgroundColor: '#ffffff', color: '#000000', padding: '3px 8px', border: '1px solid #ccc', borderRadius: '3px', width: '150px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', color: '#f8fafc' }}>Treated Job ID</label>
                <input 
                  type="text" 
                  value={treatedJobId} 
                  onChange={(e) => setTreatedJobId(e.target.value)}
                  style={{ backgroundColor: '#ffffff', color: '#000000', padding: '3px 8px', border: '1px solid #ccc', borderRadius: '3px', width: '150px', fontSize: '13px' }}
                />
              </div>

              <button 
                onClick={handleRunDeseq2}
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', textAlign: 'left', width: 'fit-content', marginTop: '4px' }}
              >
                Run Differential Expression
              </button>
            </div>
          </section>

          {/* Live Terminal Output Stream */}
          <div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', marginBottom: '6px' }}>
              LIVE TERMINAL STREAM :: {jobId}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8', backgroundColor: '#020617', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b', maxHeight: '180px', overflowY: 'auto' }}>
              {terminalLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '3px' }}>
                  <span style={{ color: '#4ade80' }}>[SYSTEM]</span> {log.replace('[SYSTEM]', '').trim()}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: DESeq2 DEG TABLE */}
      {activeTab === 'degs' && (
        <main>
          <DEGTable />
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
