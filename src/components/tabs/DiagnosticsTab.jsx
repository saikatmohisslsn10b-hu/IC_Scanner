import React from 'react';
import { ShieldCheck, Zap, AlertTriangle, Activity } from 'lucide-react';

export default function DiagnosticsTab({ testing }) {
  if (!testing) return <p className="text-sm text-slate-400">No diagnostics data.</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={16} className="text-primary-600" />
        <span className="section-title !mb-0">Testing & Diagnostics</span>
      </div>

      {/* Expected Voltages */}
      <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl mb-4 flex items-center gap-3">
        <Zap size={18} className="text-primary-600 shrink-0" />
        <div>
          <p className="data-label">Expected Operating Voltages</p>
          <p className="text-sm font-semibold text-primary-800">{testing.expectedVoltages}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Multimeter */}
        <div className="card p-4">
          <h4 className="data-label mb-3">Multimeter Tests</h4>
          <ul className="space-y-2">
            {testing.multimeter?.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        {/* Oscilloscope */}
        <div className="card p-4">
          <h4 className="data-label mb-3">Oscilloscope Checks</h4>
          <ul className="space-y-2">
            {testing.oscilloscope?.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <Activity size={12} className="text-accent-600 mt-0.5 shrink-0" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Fault Symptoms */}
      <div className="card p-4 mt-4">
        <h4 className="data-label mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          Fault Symptoms
        </h4>
        <ul className="space-y-2">
          {testing.faultSymptoms?.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Safety */}
      <div className="card p-4 mt-4 border-l-4 border-l-amber-400">
        <h4 className="data-label mb-3">Safety Precautions</h4>
        <ul className="space-y-2">
          {testing.safety?.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-amber-500 shrink-0">•</span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}