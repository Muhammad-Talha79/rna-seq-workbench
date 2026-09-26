import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalLogs({ jobId }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!jobId || !terminalRef.current) return;

    // Clear previous contents
    terminalRef.current.innerHTML = '';

    const term = new Terminal({
      theme: { 
        background: '#020617', 
        foreground: '#38bdf8', 
        cursor: '#f8fafc',
        selectionBackground: '#1e293b'
      },
      fontSize: 12,
      fontFamily: 'Consolas, "Courier New", monospace',
      convertEol: true,
      disableStdin: true,
      rows: 14
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln(`\x1b[32m[SYSTEM]\x1b[0m Established WebSocket stream for Job: \x1b[36m${jobId}\x1b[0m\n`);

    const ws = new WebSocket(`ws://localhost:8000/api/v1/pipeline/ws/logs/${jobId}`);

    ws.onmessage = (event) => {
      term.writeln(event.data);
      term.scrollToBottom();
    };

    ws.onerror = () => {
      term.writeln('\x1b[31m[ERROR]\x1b[0m Failed to connect to WebSocket stream.');
    };

    ws.onclose = () => {
      term.writeln('\n\x1b[33m[SYSTEM]\x1b[0m Stream closed by server.');
    };

    return () => {
      ws.close();
      term.dispose();
    };
  }, [jobId]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-300 font-semibold tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          LIVE TERMINAL STREAM :: {jobId}
        </span>
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
      </div>
      <div ref={terminalRef} className="w-full bg-slate-950 rounded-lg overflow-hidden" />
    </div>
  );
}
