import React from 'react';
import { Cpu } from 'lucide-react';

export default function AnalysisLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 sm:py-32">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary-400/20 blur-3xl rounded-full animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-white border-2 border-primary-200 flex items-center justify-center shadow-lg">
          <Cpu className="w-8 h-8 text-primary-600 animate-[spin_3s_linear_infinite]" />
        </div>
      </div>
      <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Analyzing IC</h3>
      <p className="text-sm text-slate-400 font-mono animate-pulse">
        Running neural OCR & datasheet correlation...
      </p>
      <div className="mt-6 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full animate-[loading_2s_ease-in-out_infinite]"
          style={{ width: '60%', animation: 'loading 2s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}