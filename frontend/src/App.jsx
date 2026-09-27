import React, { useState, useEffect } from 'react';
import DEGTable from './components/DEGTable';
import UMAPScatterPlot from './components/UMAPScatterPlot';

export default function App() {
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Pipeline State
  const [sraAccession, setSraAccession] = useState('SRR3734796');
  const [cpuThreads, setCpuThreads] = useState(4);
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState('IDLE');
  const [terminalLogs, setTerminalLogs] = useState(['[SYSTEM] Click "Execute Alignment & Counts" to begin read processing.']);
  
  const [controlJobId, setControlJobId] = useState('ctrl_sample_1');
  const [treatedJobId, setTreatedJobId] = useState('treat_sample_1');
  const [deseqStatus, setDeseqStatus] = useState('IDLE');
  const [deseqReportUrl, setDeseqReportUrl] = useState('');

  // Single-Cell State
  const [loadingScRna, setLoadingScRna] = useState(false);
  const [scRnaData, setScRnaData] = useState(null);

  // Poll backend for active job updates
  useEffect(() => {
    if (!jobId || jobStatus === 'COMPLETED' || jobStatus === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/pipeline/status/${jobId}`);
        const data = await res.json();
        
        if (data.status) {
          setJobStatus(data.status);
          if (data.logs) setTerminalLogs(data.logs);
        }

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const handleLaunchPipeline = async () => {
    setJobStatus('STARTING...');
    setTerminalLogs(['[SYSTEM] Requesting backend alignment worker...']);

    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sra_accession: sraAccession, threads: Number(cpuThreads) })
      });
      const data = await res.json();
      
      if (data.job_id) {
        setJobId(data.job_id);
        setJobStatus('RUNNING');
      }
    } catch (err) {
      setJobStatus('FAILED');
      setTerminalLogs(['[ERROR] Failed to connect to backend server.']);
    }
  };

  const handleRunDeseq2 = async () => {
    setDeseqStatus('RUNNING');
    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/deseq2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ control_job_id: controlJobId, treated_job_id: treatedJobId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDeseqStatus('COMPLETED');
        setDeseqReportUrl(data.report_url);
      }
    } catch (err) {
      setDeseqStatus('FAILED');
    }
  };

  const runScRnaPipeline = async () => {
    setLoadingScRna(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/pipeline/scrna/analyze', { method: 'POST' });
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
      {/* Navigation Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#ffffff' }}>RNA-Seq Transcriptomics Workbench</h1>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>FastAPI + HISAT2 + DESeq2 + Scanpy Engine</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '4px', borderRadius: '8px' }}>
          <button onClick={() => setActiveTab('pipeline')} style={{ padding: '8px 16px', background: activeTab === 'pipeline' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            Bulk Pipeline Launcher
          </button>
          <button onClick={() => setActiveTab('degs')} style={{ padding: '8px 16px', background: activeTab === 'degs' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            DESeq2 DEG Visualizer
          </button>
          <button onClick={() => setActiveTab('scrna')} style={{ padding: '8px 16px', background: activeTab === 'scrna' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            Single-Cell UMAP
          </button>
        </div>
      </header>

      {/* TAB 1: BULK PIPELINE LAUNCHER */}
      {activeTab === 'pipeline' && (
        <main>
          {/* Section 1: Alignment Run */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#ffffff' }}>❯ Launch Pipeline Run</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>SRA Accession</label>
                <input type="text" value={sraAccession} onChange={(e) => setSraAccession(e.target.value)} style={{ padding: '3px 8px', width: '150px', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>CPU Threads</label>
                <input type="number" value={cpuThreads} onChange={(e) => setCpuThreads(e.target.value)} style={{ padding: '3px 8px', width: '150px', fontSize: '13px' }} />
              </div>

              <button 
                onClick={handleLaunchPipeline} 
                disabled={jobStatus === 'RUNNING'}
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', textAlign: 'left', width: 'fit-content' }}
              >
                {jobStatus === 'RUNNING' ? 'Running Alignment Pipeline...' : 'Execute Alignment & Counts'}
              </button>

              <div style={{ fontSize: '13px', marginTop: '4px' }}>Job ID: <b>{jobId || 'N/A'}</b></div>
              <div style={{ fontSize: '13px' }}>
                Status: <span style={{ color: jobStatus === 'COMPLETED' ? '#4ade80' : jobStatus === 'RUNNING' ? '#facc15' : '#38bdf8', fontWeight: 'bold' }}>{jobStatus}</span>
              </div>

              {jobId && (
                <button 
                  onClick={() => window.open(`http://localhost:8000/api/v1/pipeline/fastqc/${jobId}`, '_blank')}
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', marginTop: '4px' }}
                >
                  <span>📋</span> Inspect FastQC Report
                </button>
              )}
            </div>
          </section>

          {/* Section 2: DESeq2 Differential Expression */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#ffffff' }}>⚗ DESeq2 Differential Expression</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>Control Job ID</label>
                <input type="text" value={controlJobId} onChange={(e) => setControlJobId(e.target.value)} style={{ padding: '3px 8px', width: '150px', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px' }}>Treated Job ID</label>
                <input type="text" value={treatedJobId} onChange={(e) => setTreatedJobId(e.target.value)} style={{ padding: '3px 8px', width: '150px', fontSize: '13px' }} />
              </div>

              <button 
                onClick={handleRunDeseq2}
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', textAlign: 'left', width: 'fit-content' }}
              >
                Run Differential Expression
              </button>

              <div style={{ fontSize: '13px' }}>
                DESeq2 Status: <span style={{ color: deseqStatus === 'COMPLETED' ? '#4ade80' : '#38bdf8', fontWeight: 'bold' }}>{deseqStatus}</span>
              </div>

              {deseqReportUrl && (
                <button 
                  onClick={() => window.open(`http://localhost:8000${deseqReportUrl}`, '_blank')}
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #999', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
                >
                  <span>📊</span> Open DESeq2 MultiQC Report
                </button>
              )}
            </div>
          </section>

          {/* Terminal Stream */}
          <div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', marginBottom: '6px' }}>
              LIVE TERMINAL STREAM :: {jobId || 'IDLE'}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8', backgroundColor: '#020617', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b', minHeight: '120px', maxHeight: '200px', overflowY: 'auto' }}>
              {terminalLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '3px' }}>
                  <span style={{ color: '#4ade80' }}>[SYSTEM]</span> {log.replace('[SYSTEM]', '').trim()}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {activeTab === 'degs' && <main><DEGTable /></main>}

      {activeTab === 'scrna' && (
        <main>
          <div style={{ marginBottom: '16px' }}>
            <button onClick={runScRnaPipeline} disabled={loadingScRna} style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              {loadingScRna ? 'Executing Scanpy Pipeline...' : 'Run Single-Cell Analysis'}
            </button>
          </div>
          <UMAPScatterPlot umapData={scRnaData?.umap_coordinates || []} clusters={scRnaData?.clusters || {}} nCells={scRnaData?.n_cells} nGenes={scRnaData?.n_genes} />
        </main>
      )}
    </div>
  );
}
