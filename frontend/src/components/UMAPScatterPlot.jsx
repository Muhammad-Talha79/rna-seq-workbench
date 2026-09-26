import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const CLUSTER_COLORS = ['#38bdf8', '#f43f5e', '#a855f7', '#34d399', '#fbbf24', '#e879f9', '#f97316'];

export default function UMAPScatterPlot({ umapData, clusters, nCells, nGenes }) {
  if (!umapData || umapData.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
        No scRNA-seq UMAP coordinates available. Run single-cell processing to generate clustering embeddings.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Single-Cell UMAP Embedding</h3>
          <p className="text-xs text-slate-400">
            Dimensionally reduced cell clusters ({nCells || umapData.length} cells, {nGenes || 'HVG'} genes) via Scanpy Leiden Algorithm
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(clusters || {}).map(([clusterId, count], idx) => (
            <span 
              key={clusterId} 
              className="text-xs px-2.5 py-1 rounded font-mono border font-medium"
              style={{ 
                color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length], 
                borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] + '40',
                backgroundColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] + '15'
              }}
            >
              Cluster {clusterId}: {count} cells
            </span>
          ))}
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <XAxis 
              type="number" 
              dataKey="x" 
              name="UMAP_1" 
              label={{ value: 'UMAP 1', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
              tick={{ fill: '#64748b', fontSize: 11 }} 
              stroke="#334155"
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="UMAP_2" 
              label={{ value: 'UMAP 2', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
              tick={{ fill: '#64748b', fontSize: 11 }} 
              stroke="#334155"
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              content={({ payload }) => {
                if (payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                      <p className="font-mono text-cyan-400 font-semibold">{data.cell_id}</p>
                      <p className="text-slate-200">Cluster: <span className="font-bold">{data.cluster}</span></p>
                      <p className="text-slate-400 font-mono">Coords: ({data.x.toFixed(2)}, {data.y.toFixed(2)})</p>
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
