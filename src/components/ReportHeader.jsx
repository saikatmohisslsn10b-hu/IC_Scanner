import React from 'react';
import { Download, RotateCcw, FileText, ShieldCheck, Cpu } from 'lucide-react';
import { extractGateName } from "../utils/logicEval";

const GATE_ASSETS = {
  and: 'https://upload.wikimedia.org/wikipedia/commons/6/64/AND_ANSI.svg',
  or: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/OR_ANSI.svg',
  nand: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/NAND_ANSI.svg',
  nor: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/NOR_ANSI.svg',
  xor: 'https://upload.wikimedia.org/wikipedia/commons/0/01/XOR_ANSI.svg',
  xnor: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/XNOR_ANSI.svg',
  not: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/NOT_ANSI.svg'
};

export default function ReportHeader({ report, onNewScan, onPdf, onLabPdf, isGenerating }) {
  const { humanReadableLogicType, icCategory, gateType } = report.logicInfo || {};
  const { name, number, manufacturer, family, confidence } = report.identification || {};

  // USE THE EXTRACTOR: Check both gateType and humanReadableLogicType to find the exact gate
  const rawTypeString = gateType || humanReadableLogicType || '';
  const exactGate = extractGateName(rawTypeString);
  
  // Now it will correctly find "and" even if the string was "AND Gate"
  const diagramUrl = exactGate ? GATE_ASSETS[exactGate.toLowerCase()] : null;

  return (
    <div className="card p-5 sm:p-6 border-l-4 border-l-primary-600 mb-6 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left Section: IC Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="badge bg-primary-50 text-primary-700 border border-primary-100">Identified</span>
            {family && <span className="badge bg-accent-50 text-accent-700 border border-accent-100">{family}</span>}
            {icCategory && (
              <span className="badge bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                <Cpu size={12} />
                {icCategory}
              </span>
            )}
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight truncate">
            {name || 'Unknown IC'}
          </h2>
          
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
            <span><span className="data-label">Part No: </span><span className="data-value font-mono">{number}</span></span>
            <span><span className="data-label">Maker: </span><span className="data-value">{manufacturer}</span></span>
            <span><span className="data-label">Package: </span><span className="data-value">{report.packageType || 'N/A'}</span></span>
            
            {humanReadableLogicType && (
              <span className="hidden sm:inline">
                <span className="data-label">Type: </span>
                <span className="data-value font-semibold text-purple-700">{humanReadableLogicType}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center Section: Dynamic Image OR Safe Fallback */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4">
           {diagramUrl ? (
             <img 
               src={diagramUrl} 
               alt={`${gateType} logic gate diagram`} 
               className="h-16 lg:h-20 object-contain drop-shadow-sm opacity-80"
               style={{ filter: 'grayscale(100%) contrast(120%)' }} 
             />
           ) : (
             <div className="flex flex-col items-center justify-center opacity-60">
                <Cpu size={48} className="text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{icCategory || 'Integrated Circuit'}</span>
             </div>
           )}
        </div>

        {/* Right Section: Confidence Badge */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-primary-50 border border-primary-100 flex flex-col items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-600 mb-1" />
            <span className="text-2xl font-display font-bold text-primary-700">{confidence || 0}%</span>
            <span className="text-[9px] font-semibold text-primary-500 uppercase tracking-wider">Confidence</span>
          </div>
        </div>
        
      </div>

      <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100">
        <button onClick={onPdf} disabled={isGenerating} className="btn-primary text-xs py-2.5 px-4 disabled:opacity-50">
          <Download size={14} /> {isGenerating ? 'Generating...' : 'PDF Report'}
        </button>
        <button onClick={onLabPdf} disabled={isGenerating} className="btn-secondary text-xs py-2.5 px-4 disabled:opacity-50">
          <FileText size={14} /> Lab Record
        </button>
        <button onClick={onNewScan} className="btn-secondary text-xs py-2.5 px-4 ml-auto">
          <RotateCcw size={14} /> New Scan
        </button>
      </div>
    </div>
  );
}