import React, { useState, useEffect } from 'react';
import { Table2, ToggleLeft, ToggleRight, Cpu, Settings2 } from 'lucide-react';
import { isSimpleGate, generateTruthTable, evaluateGate, getInputLabels, extractGateName } from '../../utils/logicEval';

export default function TruthTableTab({ logicInfo }) {
  // 1. Identify the Gate Safely
  const rawTypeString = logicInfo?.gateType || logicInfo?.humanReadableLogicType || logicInfo?.icCategory || '';
  const exactGate = extractGateName(rawTypeString);
  const isStandardGate = isSimpleGate(rawTypeString);
  const isSingleInputGate = exactGate === 'NOT' || exactGate === 'BUFFER';
  const isDigital = logicInfo?.isDigital;
  const aiTruthTable = logicInfo?.truthTable || [];

  // 2. Setup State for standard vs complex chips
  const initialBits = isSingleInputGate ? 1 : 2;
  const [bitCount, setBitCount] = useState(initialBits);
  const [standardInputs, setStandardInputs] = useState(Array(initialBits).fill(0));

  const complexInputCount = aiTruthTable.length > 0 ? (aiTruthTable[0].inputs?.length || 0) : 0;
  const [complexInputs, setComplexInputs] = useState(Array(complexInputCount).fill(0));

  // 3. Sync State when dependencies change
  useEffect(() => {
    if (isStandardGate) {
      setStandardInputs(Array(bitCount).fill(0));
    }
  }, [bitCount, isStandardGate]);

  useEffect(() => {
    if (!isStandardGate && complexInputCount > 0) {
      setComplexInputs(Array(complexInputCount).fill(0));
    }
  }, [complexInputCount, isStandardGate]);

  // 4. Early return if data is missing or invalid
  if (!isDigital || (!isStandardGate && aiTruthTable.length === 0)) {
    return (
      <div className="text-center py-12">
        <Cpu size={32} className="text-slate-200 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Truth table simulation is not available for this type of component.</p>
      </div>
    );
  }

  // 5. Build the UI Variables
  let currentLabels, fullTable, currentInputs, toggleInput, liveOutputs;

  if (isStandardGate) {
    // Mode 1: Standard Gate (Dynamic Bits - Uses exactly extracted gate name)
    currentLabels = getInputLabels(bitCount);
    fullTable = generateTruthTable(exactGate, bitCount);
    currentInputs = standardInputs;
    toggleInput = (idx) => {
      setStandardInputs(prev => {
        const next = [...prev];
        next[idx] = next[idx] ? 0 : 1;
        return next;
      });
    };
    liveOutputs = [evaluateGate(exactGate, standardInputs)];
  } else {
    // Mode 2: Complex IC (Fixed AI Data)
    currentLabels = Array.from({ length: complexInputCount }, (_, i) => 
      complexInputCount <= 3 ? String.fromCharCode(65 + i) : `In${i}`
    );
    fullTable = aiTruthTable;
    currentInputs = complexInputs;
    toggleInput = (idx) => {
      setComplexInputs(prev => {
        const next = [...prev];
        next[idx] = next[idx] ? 0 : 1;
        return next;
      });
    };
    
    // Find the matching row
    const matchingRow = aiTruthTable.find(row => 
      row.inputs && row.inputs.every((val, index) => val === complexInputs[index])
    );
    const outputCount = aiTruthTable[0]?.outputs?.length || 1;
    liveOutputs = matchingRow ? matchingRow.outputs : Array(outputCount).fill(0);
  }

  const outputLabels = Array.from({ length: liveOutputs.length }, (_, i) => 
    liveOutputs.length === 1 ? 'Y' : `Out${i}`
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Table2 size={16} className="text-primary-600" />
          <span className="section-title !mb-0">Interactive Simulator — {exactGate || logicInfo?.icCategory || 'Digital Logic'}</span>
        </div>
        
        {/* Dynamic Bit Selector - ONLY shows if it's a standard gate */}
        {isStandardGate && (
          <div className="flex items-center gap-3">
            <Settings2 size={14} className="text-slate-400" />
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Input Bits:</span>
            <select
              value={bitCount}
              onChange={(e) => setBitCount(Number(e.target.value))}
              disabled={isSingleInputGate}
              className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              {isSingleInputGate ? (
                <option value={1}>1-Bit ({exactGate})</option>
              ) : (
                [2, 3, 4, 8].map(num => (
                  <option key={num} value={num}>{num}-Bit Simulation</option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* Live Simulator Panel */}
      <div className="p-5 bg-slate-900 rounded-xl mb-6 shadow-inner">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Live Simulator</p>
        <div className="flex flex-wrap items-center gap-4">
          {currentLabels.map((label, i) => (
            <button key={label} onClick={() => toggleInput(i)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                currentInputs[i]
                  ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}>
              {currentInputs[i] ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              <span className="text-sm font-mono font-bold">{label} = {currentInputs[i]}</span>
            </button>
          ))}
          
          <div className="h-8 w-px bg-slate-700 hidden sm:block mx-2" />
          
          {outputLabels.map((label, i) => (
            <div key={label} className={`flex items-center gap-2 px-6 py-3 border rounded-xl transition-colors ${
              liveOutputs[i] === 1 ? 'bg-accent-700 border-accent-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              <span className="text-sm font-mono font-bold">{label} = {liveOutputs[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Truth Table Data */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {currentLabels.map(l => <th key={l} className="px-4 py-3 data-label text-center border-r border-slate-100">{l}</th>)}
              {outputLabels.map(l => <th key={l} className="px-4 py-3 data-label text-center bg-slate-100">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {fullTable.map((row, i) => {
              const isThisRow = row.inputs?.every((v, j) => v === currentInputs[j]);
              return (
                <tr key={i} className={`transition-colors ${isThisRow ? 'bg-primary-50/50' : 'hover:bg-slate-50/50'}`}>
                  {row.inputs?.map((v, j) => (
                    <td key={j} className={`px-4 py-2.5 text-center font-mono font-semibold border-r border-slate-100 border-t ${
                      isThisRow ? 'text-primary-700' : v === 1 ? 'text-slate-800' : 'text-slate-400'
                    }`}>{v}</td>
                  ))}
                  {row.outputs?.map((v, j) => (
                    <td key={j} className={`px-4 py-2.5 text-center font-mono font-bold border-t border-slate-100 ${
                      isThisRow ? 'text-accent-700 text-base bg-primary-50' : 
                      v === 1 ? 'text-accent-600 bg-slate-50/50' : 'text-slate-300'
                    }`}>{v}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}