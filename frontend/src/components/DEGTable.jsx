import React, { useState } from 'react';
import { Download, Search, Filter } from 'lucide-react';

export default function DEGTable({ degData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlySignificant, setOnlySignificant] = useState(false);

  if (!degData || degData.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
        No differential expression data available.
      </div>
    );
  }

  const filteredData = degData.filter(row => {
    const matchesSearch = row.gene_id.toLowerCase().includes(searchTerm.toLowerCase());
    const isSig = Math.abs(row.log2_fold_change) >= 1.0 && row.padj <= 0.05;
    return matchesSearch && (!onlySignificant || isSig);
  });

  const exportCSV = () => {
    const headers = ["Gene ID", "log2FoldChange", "padj"];
    const rows = filteredData.map(r => [r.gene_id, r.log2_fold_change, r.padj]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "deg_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-white">Differentially Expressed Genes</h3>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search Gene..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 text-sm rounded-lg pl-9 pr-3 py-2 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => setOnlySignificant(!onlySignificant)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
              onlySignificant
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Sig Only
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 py-2 rounded-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-lg">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400 sticky top-0">
            <tr>
              <th className="px-4 py-3">Gene ID</th>
              <th className="px-4 py-3">log2 Fold Change</th>
              <th className="px-4 py-3">Adjusted P-Value</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/50">
            {filteredData.map((row, idx) => {
              const isUp = row.log2_fold_change >= 1.0 && row.padj <= 0.05;
              const isDown = row.log2_fold_change <= -1.0 && row.padj <= 0.05;
              return (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-cyan-400 font-medium">{row.gene_id}</td>
                  <td className="px-4 py-2.5 font-mono">{row.log2_fold_change.toFixed(3)}</td>
                  <td className="px-4 py-2.5 font-mono">{row.padj.toExponential(2)}</td>
                  <td className="px-4 py-2.5">
                    {isUp && <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800">Up</span>}
                    {isDown && <span className="px-2 py-0.5 rounded text-xs bg-rose-950 text-rose-400 border border-rose-800">Down</span>}
                    {!isUp && !isDown && <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-500">NS</span>}
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
