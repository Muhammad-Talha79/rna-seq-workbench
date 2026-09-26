import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

const CLUSTER_COLORS = ['#38bdf8', '#f43f5e', '#a855f7', '#34d399', '#fbbf24', '#e879f9', '#f97316'];

export default function UMAPScatterPlot({ umapData, clusters, nCells, nGenes }) {
  if (!umapData || umapData.length === 0) {
    return (
      <div style={{ padding: '1.5rem', backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #1e293b', color: '#94a3b8', textAlign: 'center' }}>
        No scRNA-seq UMAP coordinates available. Run single-cell processing to generate clustering embeddings.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #1e293b', padding: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff', margin: 0 }}>Single-Cell UMAP Embedding</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            Dimensionally reduced cell clusters ({nCells || umapData.length} cells, {nGenes || 'HVG'} genes) via Scanpy Leiden Algorithm
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {Object.entries(clusters || {}).map(([clusterId, count], idx) => (
            <span 
              key={clusterId} 
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.25rem 0.625rem', 
                borderRadius: '0.375rem', 
                fontFamily: 'monospace', 
                fontWeight: '500',
                border: `1px solid ${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}40`,
                color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length], 
                backgroundColor: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}15`
              }}
            >
              Cluster {clusterId}: {count} cells
            </span>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: '360px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="UMAP_1" 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              stroke="#334155"
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="UMAP_2" 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              stroke="#334155"
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              content={({ payload }) => {
                if (payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
                      <p style={{ margin: 0, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>{data.cell_id}</p>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#f8fafc' }}>Cluster: <strong>{data.cluster}</strong></p>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontFamily: 'monospace' }}>UMAP: ({data.x.toFixed(2)}, {data.y.toFixed(2)})</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Cells" data={umapData}>
              {umapData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CLUSTER_COLORS[parseInt(entry.cluster) % CLUSTER_COLORS.length] || '#38bdf8'} 
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
