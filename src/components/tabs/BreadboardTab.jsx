import React, { useState } from 'react';
import { LayoutGrid, CheckCircle2, Cpu, PenTool } from 'lucide-react';
import InteractiveBreadboard from './InteractiveBreadboard';

export default function BreadboardTab({ steps, icName, report }) {
  const [mode, setMode] = useState('auto'); // 'auto' | 'custom'

  if (!steps?.length) return (
    <div className="text-center py-12">
      <LayoutGrid size={32} className="text-slate-200 mx-auto mb-3" />
      <p className="text-sm text-slate-400">No breadboard guide available for this IC.</p>
    </div>
  );

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-primary-600" />
          <span className="text-lg font-display font-bold text-slate-800 !mb-0">
            Interactive Breadboard — {icName}
          </span>
        </div>

        {/* Mode Toggle Switches */}
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setMode('auto')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'auto' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cpu size={14} /> Live Simulation
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'custom' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool size={14} /> Build Your Own
          </button>
        </div>
      </div>

      {mode === 'auto' && (
        <div className="mb-6 p-3 bg-primary-50 border border-primary-100 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary-600 shrink-0" />
          <p className="text-xs text-primary-700 font-medium">
            Observing proper connections. Click the switches below the board to test logic states.
          </p>
        </div>
      )}

      {mode === 'custom' && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <PenTool size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            Practice mode: Drag wires between holes to connect power, ground, and inputs.
          </p>
        </div>
      )}

      {/* Interactive 2D SVG Simulator */}
      <InteractiveBreadboard report={report} mode={mode} />
      
      {/* Reference Guide (Only show in Custom mode so they can read the steps while wiring) */}
      {mode === 'custom' && (
        <div className="mt-8 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 mb-4">Wiring Guide</h4>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-7 h-7 rounded-full bg-white border-2 border-primary-200 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary-600">{i + 1}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}