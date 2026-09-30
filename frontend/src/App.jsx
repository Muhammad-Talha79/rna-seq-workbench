import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CLUSTER_COLORS = [
  '#38bdf8', '#34d399', '#f43f5e', '#fbbf24', 
  '#a855f7', '#ec4899', '#6366f1', '#14b8a6'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Pipeline State
  const [sra, setSra] = useState('SRR3734796');
  const [threads, setThreads] = useState(4);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('IDLE');
  const [logs, setLogs] = useState([]);
  const [pipelineOutput, setPipelineOutput] = useState(null);
  
  // DESeq2 State
  const [ctrlId, setCtrlId] = useState('ctrl_sample_1');
  const [treatId, setTreatId] = useState('treat_sample_1');
  const [deseqStatus, setDeseqStatus] = useState('IDLE');
  const [compReportUrl, setCompReportUrl] = useState(null);
  const [degTable, setDegTable] = useState([]);

  // Single-Cell State
  const [scData, setScData] = useState(null);
  const [scLoading, setScLoading] = useState(false);

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: "Hi! I am your AI assistant. Ask me 'How to use this app?' or 'What can this app do?' for a full walkthrough!" }
  ]);

  // Poll Job Status
  useEffect(() => {
    let interval = null;
    if (jobId && jobStatus === 'RUNNING') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/api/v1/pipeline/status/${jobId}`);
          setJobStatus(res.data.status);
          setLogs(res.data.logs || []);
          if (res.data.status === 'COMPLETED') {
            setPipelineOutput(res.data.meta);
            clearInterval(interval);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const handleLaunchPipeline = async () => {
    try {
      setJobStatus('PENDING');
      setLogs([`[SYSTEM] Submitting job for accession ${sra}...`]);
      setPipelineOutput(null);
      setJobId(null);

      const res = await axios.post(`${API_URL}/api/v1/pipeline/align`, {
        sra_accession: sra,
        threads: parseInt(threads)
      });
      
      setJobId(res.data.job_id);
      setJobStatus('RUNNING');
    } catch (err) {
      setJobStatus('FAILED');
      setLogs(prev => [...prev, '[ERROR] Failed to start pipeline job. Check console.']);
    }
  };

  const handleRunDeseq = async () => {
    try {
      setDeseqStatus('RUNNING');
      const res = await axios.post(`${API_URL}/api/v1/pipeline/deseq2`, {
        control_job_id: ctrlId,
        treated_job_id: treatId
      });
      setDeseqStatus('COMPLETED');
      setCompReportUrl(res.data.report_url);
      setDegTable(res.data.degs || []);
    } catch (err) {
      setDeseqStatus('FAILED');
    }
  };

  const handleRunSingleCell = async () => {
    try {
      setScLoading(true);
      const res = await axios.post(`${API_URL}/api/v1/pipeline/scrna/analyze`);
      setScData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setScLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const res = await axios.post(`${API_URL}/api/v1/chat`, { message: userMsg });
      setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am having trouble connecting to the backend assistant service.' }]);
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>RNA-Seq Transcriptomics Workbench</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>FastAPI + HISAT2 + DESeq2 + Scanpy Engine</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setActiveTab('pipeline')} style={{ background: activeTab === 'pipeline' ? '#0284c7' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Bulk Pipeline Launcher</button>
          <button onClick={() => setActiveTab('deg')} style={{ background: activeTab === 'deg' ? '#0284c7' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>DESeq2 DEG Visualizer</button>
          <button onClick={() => setActiveTab('sc')} style={{ background: activeTab === 'sc' ? '#0284c7' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Single-Cell UMAP</button>
        </div>
      </div>

      {/* Tab 1: Pipeline Launcher */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f8fafc' }}>&gt; Launch Alignment Run</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>SRA Accession</label>
              <input type="text" value={sra} onChange={e => setSra(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>CPU Threads</label>
              <input type="number" value={threads} onChange={e => setThreads(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px' }} />
            </div>
            <button onClick={handleLaunchPipeline} style={{ width: '100%', background: '#0369a1', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Execute Alignment &amp; Counts</button>

            {jobId && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                <p style={{ margin: '4px 0' }}>Job ID: <strong style={{ color: '#38bdf8' }}>{jobId}</strong></p>
                <p style={{ margin: '4px 0' }}>Status: <strong style={{ color: jobStatus === 'COMPLETED' ? '#34d399' : '#fbbf24' }}>{jobStatus}</strong></p>
                
                {pipelineOutput && (
                  <div style={{ background: '#020617', padding: '12px', borderRadius: '6px', marginTop: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8' }}>Pipeline Output ({pipelineOutput.sra_id})</h4>
                    <p style={{ margin: '2px 0', fontSize: '13px' }}>Total Reads: <strong>{pipelineOutput.reads}</strong></p>
                    <p style={{ margin: '2px 0', fontSize: '13px' }}>Alignment Rate: <strong>{pipelineOutput.align_rate}%</strong></p>
                    <p style={{ margin: '2px 0', fontSize: '13px' }}>GC Content: <strong>{pipelineOutput.gc_content}</strong></p>
                  </div>
                )}

                {jobStatus === 'COMPLETED' && (
                  <a href={`${API_URL}/api/v1/pipeline/fastqc/${jobId}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', background: '#1e293b', color: '#38bdf8', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>📑 Inspect FastQC Report ({sra})</a>
                )}
              </div>
            )}
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0 }}>📊 DESeq2 Differential Expression</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Control Job ID</label>
              <input type="text" value={ctrlId} onChange={e => setCtrlId(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Treated Job ID</label>
              <input type="text" value={treatId} onChange={e => setTreatId(e.target.value)} style={{ width: '100%', background: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px' }} />
            </div>
            <button onClick={handleRunDeseq} style={{ width: '100%', background: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Run Differential Expression</button>
            {compReportUrl && (
              <a href={`${API_URL}${compReportUrl}`} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '12px', color: '#38bdf8' }}>🔗 Open DESeq2 Summary Report</a>
            )}
          </div>

          <div style={{ gridColumn: 'span 2', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}>LIVE TERMINAL STREAM :: {jobId || 'IDLE'}</h3>
            <div style={{ background: '#090d16', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px', height: '180px', overflowY: 'auto' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('HISAT2') ? '#38bdf8' : log.includes('FEATURECOUNTS') ? '#34d399' : '#e2e8f0', marginBottom: '4px' }}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DEG Visualizer */}
      {activeTab === 'deg' && (
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
          <h2>DESeq2 Differentially Expressed Genes (DEGs)</h2>
          {degTable.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No analysis executed yet. Run DESeq2 in the Bulk Pipeline Launcher to generate expression metrics.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
              <thead>
                <tr style={{ background: '#1e293b', textAlign: 'left', color: '#38bdf8' }}>
                  <th style={{ padding: '10px' }}>Gene</th>
                  <th style={{ padding: '10px' }}>Base Mean</th>
                  <th style={{ padding: '10px' }}>Log2 Fold Change</th>
                  <th style={{ padding: '10px' }}>p-value</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {degTable.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.gene}</td>
                    <td style={{ padding: '10px' }}>{row.baseMean}</td>
                    <td style={{ padding: '10px', color: row.log2FoldChange > 0 ? '#34d399' : '#f43f5e' }}>
                      {row.log2FoldChange > 0 ? `+${row.log2FoldChange}` : row.log2FoldChange}
                    </td>
                    <td style={{ padding: '10px' }}>{row.pValue}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        background: row.status === 'UP' ? '#065f46' : row.status === 'DOWN' ? '#881337' : '#334155',
                        color: row.status === 'UP' ? '#34d399' : row.status === 'DOWN' ? '#f43f5e' : '#94a3b8',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Single Cell UMAP */}
      {activeTab === 'sc' && (
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
          <h2>Single-Cell Transcriptomics UMAP</h2>
          <button onClick={handleRunSingleCell} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px' }}>
            {scLoading ? 'Processing Scanpy Pipeline...' : 'Run Single-Cell Analysis'}
          </button>
          
          {scData && (
            <div>
              <p>Processed <strong>{scData.n_cells}</strong> cells and <strong>{scData.n_genes}</strong> genes.</p>
              
              <div style={{ background: '#020617', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b', textAlign: 'center' }}>
                <svg width="600" height="400" viewBox="-12 -12 24 24" style={{ background: '#090d16', borderRadius: '6px' }}>
                  <line x1="-10" y1="0" x2="10" y2="0" stroke="#1e293b" strokeWidth="0.1" />
                  <line x1="0" y1="-10" x2="0" y2="10" stroke="#1e293b" strokeWidth="0.1" />
                  
                  {scData.umap_coordinates.map((cell, i) => {
                    const clusterIdx = parseInt(cell.cluster) % CLUSTER_COLORS.length;
                    return (
                      <circle
                        key={i}
                        cx={cell.x}
                        cy={cell.y}
                        r="0.35"
                        fill={CLUSTER_COLORS[clusterIdx]}
                        opacity="0.85"
                      />
                    );
                  })}
                </svg>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>Interactive Scanpy UMAP Embedding Plot (200 Cells, 8 Clusters)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Chatbot Widget */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        {!chatOpen ? (
          <button onClick={() => setChatOpen(true)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            💬 Help Assistant
          </button>
        ) : (
          <div style={{ width: '360px', height: '460px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#38bdf8' }}>🤖 Workbench Assistant</strong>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? '#0284c7' : '#1e293b',
                  color: '#fff', padding: '10px 12px', borderRadius: '8px', maxWidth: '85%', fontSize: '13px',
                  whiteSpace: 'pre-wrap', lineHeight: '1.4'
                }}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div style={{ padding: '10px', borderTop: '1px solid #1e293b', display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Ask 'How to use this app?'..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                style={{ flex: 1, background: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
              />
              <button onClick={handleSendChat} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
