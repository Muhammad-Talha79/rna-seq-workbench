import React, { useState } from 'react';

export default function DEGTable({ degData = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sigOnly, setSigOnly] = useState(false);

  // Default sample data fallback if degData is empty
  const displayData = degData.length > 0 ? degData : [
    { gene: "TP53", baseMean: 1240.5, log2FoldChange: 2.45, pvalue: 0.00001, padj: 0.00012 },
    { gene: "BRCA1", baseMean: 850.2, log2FoldChange: -1.82, pvalue: 0.00034, padj: 0.00210 },
    { gene: "EGFR", baseMean: 3100.8, log2FoldChange: 3.12, pvalue: 0.000001, padj: 0.000015 },
    { gene: "MYC", baseMean: 1950.4, log2FoldChange: -2.15, pvalue: 0.00012, padj: 0.00110 },
    { gene: "VEGFA", baseMean: 1420.1, log2FoldChange: 1.95, pvalue: 0.00022, padj: 0.00180 },
    { gene: "CDK4", baseMean: 620.8, log2FoldChange: 0.45, pvalue: 0.12000, padj: 0.25000 },
    { gene: "IL6", baseMean: 2100.3, log2FoldChange: 4.12, pvalue: 0.000002, padj: 0.000020 }
  ];

  const filteredData = displayData.filter((row) => {
    const matchesGene = row.gene.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSig = sigOnly ? row.padj < 0.05 : true;
    return matchesGene && matchesSig;
  });

  const exportCSV = () => {
    const headers = ["Gene", "BaseMean", "Log2FoldChange", "PValue", "Padj"];
    const rows = filteredData.map(r => [r.gene, r.baseMean, r.log2FoldChange, r.pvalue, r.padj]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "DESeq2_DEGs_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
      {/* Table Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>DESeq2 Differentially Expressed Genes (DEGs)</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Showing {filteredData.length} of {displayData.length} genes</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Search gene..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#cbd5e1' }}>
            <input 
              type="checkbox" 
              checked={sigOnly} 
              onChange={(e) => setSigOnly(e.target.checked)} 
            />
            Significant Only (padj &lt; 0.05)
          </label>

          <button 
            onClick={exportCSV}
            style={{ padding: '6px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* DEG Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', backgroundColor: '#1e293b' }}>
              <th style={{ padding: '10px' }}>Gene</th>
              <th style={{ padding: '10px' }}>Base Mean</th>
              <th style={{ padding: '10px' }}>Log2 Fold Change</th>
              <th style={{ padding: '10px' }}>p-value</th>
              <th style={{ padding: '10px' }}>Adjusted p-value (padj)</th>
              <th style={{ padding: '10px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const isSig = row.padj < 0.05;
              const isUp = row.log2FoldChange > 0;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#38bdf8' }}>{row.gene}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{row.baseMean}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: isUp ? '#34d399' : '#f43f5e' }}>
                    {isUp ? `+${row.log2FoldChange}` : row.log2FoldChange}
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{row.pvalue}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{row.padj}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: isSig ? (isUp ? '#065f46' : '#991b1b') : '#334155',
                      color: isSig ? (isUp ? '#34d399' : '#f87171') : '#94a3b8'
                    }}>
                      {isSig ? (isUp ? 'UP' : 'DOWN') : 'NS'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
