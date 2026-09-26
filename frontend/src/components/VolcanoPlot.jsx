import React from 'react';
import Plot from 'react-plotly.js';
import { ExternalLink } from 'lucide-react';

export default function VolcanoPlot({ deResults, comparisonId }) {
  if (!deResults || deResults.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
        Run a DESeq2 comparison to generate the Volcano Plot.
      </div>
    );
  }

  const xVals = deResults.map(r => Number(r.log2_fold_change || 0));
  const yVals = deResults.map(r => {
    const p = Number(r.padj ?? r.p_value ?? 1.0);
    const safeP = p > 0 ? p : 1e-10;
    return -Math.log10(safeP);
  });

  const hoverText = deResults.map((r, idx) => 
    `Gene: ${r.gene_id}<br>log2FC: ${xVals[idx].toFixed(2)}<br>-log10(padj): ${yVals[idx].toFixed(2)}`
  );

  const colors = deResults.map((r, idx) => {
    const lfc = xVals[idx];
    const yVal = yVals[idx];
    if (yVal > 1.3 && lfc >= 0.5) return '#ef4444'; // Red = Upregulated
    if (yVal > 1.3 && lfc <= -0.5) return '#3b82f6'; // Blue = Downregulated
    return '#64748b'; // Slate = Not significant
  });

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">
          Differential Expression (Volcano Plot)
        </h3>
        {comparisonId && (
          <a
            href={`http://localhost:8000/api/v1/pipeline/deseq2/html/${comparisonId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-950/50 px-3 py-1.5 rounded-lg border border-purple-800/50 transition-all font-mono"
          >
            Open Standalone Plot <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <Plot
        data={[
          {
            x: xVals,
            y: yVals,
            text: hoverText,
            hoverinfo: 'text',
            mode: 'markers',
            type: 'scatter',
            marker: {
              size: 8,
              color: colors,
              opacity: 0.85
            }
          }
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          margin: { l: 50, r: 30, t: 20, b: 50 },
          xaxis: {
            title: 'log2(Fold Change)',
            color: '#94a3b8',
            gridcolor: '#1e293b',
            zerolinecolor: '#475569'
          },
          yaxis: {
            title: '-log10(Adjusted P-Value)',
            color: '#94a3b8',
            gridcolor: '#1e293b',
            zerolinecolor: '#475569'
          }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '420px' }}
      />
    </div>
  );
}
