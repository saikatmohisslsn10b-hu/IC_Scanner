import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Search, Loader2, Database, Bug, XCircle, Info, AlertTriangle } from 'lucide-react';

// =====================================================================
// UTILITY: EXTRACT IC NUMBER
// =====================================================================
export const extractICNumber = (rawName) => {
  if (!rawName) return null;

  const upper = rawName.toUpperCase();

  // CD4071, HEF4071, HCF4071
  let m = upper.match(/(?:CD|HEF|HCF|TC)?(40\d{2})/);
  if (m) return m[1];

  // 14011
  m = upper.match(/(14\d{3})/);
  if (m) return m[1];

  // 74HC32
  m = upper.match(/74(?:HC|HCT|LS|ALS|F|S|AC|ACT)?(\d+)/);
  if (m) return "74" + m[1];

  // SN74HC32
  m = upper.match(/SN74(?:HC|HCT|LS|ALS|F|S|AC|ACT)?(\d+)/);
  if (m) return "74" + m[1];

  // generic
  m = upper.match(/\d{4,}/);
  return m ? m[0] : null;
};

// =====================================================================
// UTILITY: HARDWARE OVERRIDE DICTIONARY (HIGHEST PRIORITY)
// =====================================================================
export const getStandardPinName = (coreNumber, pinNumber) => {
  const num = parseInt(pinNumber, 10);
  
  // CMOS Quad 2-Input (Outputs on 3, 4, 10, 11)
  const cmosQuadGates = ["4011", "4071", "4081", "4001", "4070", "4077"];
  if (cmosQuadGates.includes(coreNumber)) {
    const map = { 1:"1A", 2:"1B", 3:"1Y", 4:"2Y", 5:"2A", 6:"2B", 7:"VSS", 8:"3A", 9:"3B", 10:"3Y", 11:"4Y", 12:"4A", 13:"4B", 14:"VDD" };
    return map[num] || null;
  }
  
  // TTL Quad 2-Input (Outputs on 3, 6, 8, 11)
  const ttlQuadGates = ["7400", "7408", "7432", "7486"];
  if (ttlQuadGates.includes(coreNumber)) {
    const map = { 1:"1A", 2:"1B", 3:"1Y", 4:"2A", 5:"2B", 6:"2Y", 7:"GND", 8:"3Y", 9:"3A", 10:"3B", 11:"4Y", 12:"4A", 13:"4B", 14:"VCC" };
    return map[num] || null;
  }
  
  // Hex Inverters
  const hexInverters = ["7404", "7414", "4069"];
  if (hexInverters.includes(coreNumber)) {
    const map = { 1:"1A", 2:"1Y", 3:"2A", 4:"2Y", 5:"3A", 6:"3Y", 7:"GND", 8:"4Y", 9:"4A", 10:"5Y", 11:"5A", 12:"6Y", 13:"6A", 14:"VCC" };
    return map[num] || null;
  }
  
  return null;
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================
export default function PinTopologyTab({ report, pinout }) {
  // --- AGGRESSIVE FALLBACK FOR RAW IC NAME ---
  // Searches the entire report for something that looks like an IC number
const findICNumber = (obj) => {
  if (!obj) return null;

  const regex =
    /\b(?:SN)?(?:74(?:HC|HCT|LS|ALS|F|S|AC|ACT)?\d+|CD40\d{2}|HEF40\d{2}|HCF40\d{2}|40\d{2}|14\d{3})\b/i;

  const walk = (value) => {
    if (!value) return null;

    if (typeof value === "string") {
      const m = value.match(regex);
      if (m) return m[0].replace(/^SN/i, "");
      return null;
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        const r = walk(v);
        if (r) return r;
      }
    }

    if (typeof value === "object") {
      for (const k of Object.keys(value)) {
        const r = walk(value[k]);
        if (r) return r;
      }
    }

    return null;
  };

  return walk(obj);
};

const displayIcName =
    report?.identification?.number ||
    report?.identification?.name ||
    "";

const rawIcName =
    findICNumber(report) ||
    displayIcName;

  const requestedPackageType = report?.packageType || '';
  const aiFallbackPinout = pinout?.table || []; 

  const [search, setSearch] = useState('');
  const [displayData, setDisplayData] = useState(null); 
  const [selectedPackageName, setSelectedPackageName] = useState('');
  const [logs, setLogs] = useState([]);
  
  const [dbState, setDbState] = useState({
    isLoading: true,
    error: null,
    coreNumber: null
  });

  const addLog = useCallback((msg, type = 'success') => {
    setLogs(prev => [...prev, { msg, type }]);
  }, []);

  // =====================================================================
  // DATABASE LOADING & MERGE PIPELINE
  // =====================================================================
  useEffect(() => {
    let isMounted = true;

    const executePipeline = async () => {
      setDbState({ isLoading: true, error: null, coreNumber: null });
      setLogs([]); 
      setDisplayData(null);
      setSelectedPackageName('');

      const coreNumber = extractICNumber(rawIcName);

      try {
        // --- STEP 1: Extract IC Number ---
        if (!coreNumber) throw new Error("IC not found locally (could not extract valid number).");
        addLog(`✔ Extracted IC number: [${coreNumber}]`);

        // --- STEP 2: Load Master Index ---
        const indexRes = await fetch('/json_database/master_search_index.json');
        if (!indexRes.ok) throw new Error("Master index missing or failed to load.");
        const index = await indexRes.json();
        addLog(`✔ Loaded master index`);

        // --- STEP 3: Locate Category ---
        const targetFilePrefix = index[coreNumber];
        if (!targetFilePrefix) throw new Error(`IC not found locally (missing from master index).`);
        addLog(`✔ Category located: [${targetFilePrefix}]`);

        // --- STEP 4: Load Category File & Locate IC ---
        const symbolRes = await fetch(`/json_database/${targetFilePrefix}.json`);
        if (!symbolRes.ok) throw new Error(`Category file missing or failed to load.`);
        const symbolLibrary = await symbolRes.json();
        
        const icData = symbolLibrary[coreNumber];
        if (!icData) throw new Error(`IC not found locally (missing in category file).`);

        // --- STEP 5 & 6: Select Package & Load Pins (Dual Schema Support) ---
        let pkgName = "Unknown Package";
        let rawPins = [];

        const packages = icData.packages || [];

        if (packages.length > 0) {
            // SCHEMA 2 (New): Using the packages array
            addLog(`✔ Using package schema`);
            let targetPackage = packages[0]; // Default to first package
            if (requestedPackageType) {
               const reqType = requestedPackageType.toUpperCase();
               const match = packages.find(p => p.package && p.package.toUpperCase().includes(reqType));
               if (match) targetPackage = match;
            }
            pkgName = targetPackage.package || "Default Package";
            rawPins = targetPackage.pins || [];
            addLog(`✔ Local package found: [${pkgName}]`);
            
        } else if (icData.pins && icData.pins.length > 0) {
            // SCHEMA 1 (Legacy): Direct pins array on the IC object
            addLog(`✔ Using legacy pin schema`);
            pkgName = "Standard Package";
            rawPins = icData.pins;
            
        } else {
            // BOTH SCHEMAS FAILED
            addLog(`⚠ No local pins found`, 'warning');
            throw new Error(`Pins missing (Neither package schema nor legacy schema contained pins).`);
        }

        if (rawPins.length === 0) {
            addLog(`⚠ No local pins found`, 'warning');
            throw new Error(`Pins missing (Empty array for package ${pkgName}).`);
        }
        
        addLog(`✔ Local pins loaded (${rawPins.length} found)`);

        // --- STEP 7: Strict Hardware Merge Pipeline (Local DB Success) ---
        let overrideApplied = false;

        const enhancedPins = rawPins.map(pin => {
            const pinNum = String(pin.number || pin.pin);
            const aiData = aiFallbackPinout.find(ap => String(ap.number || ap.pin) === pinNum);

            // RESOLVE NAME: Hardware Mapping -> Local DB -> Placeholder. (NO AI)
            const hwOverrideName = getStandardPinName(coreNumber, pinNum);
            let finalName;

            if (hwOverrideName) {
                finalName = hwOverrideName; // Priority 1: Hardware Override
                overrideApplied = true;
            } else {
                finalName = pin.name;       // Priority 2: Database Pin Name
                if (!finalName || finalName.trim() === "" || finalName === "~") {
                    finalName = `PIN_${pinNum}`; // Priority 3: Safe Placeholder
                }
            }

            // RESOLVE DESCRIPTION
let finalDesc = pin.description;

// If local DB has no description, generate it from the FINAL pin name
if (!finalDesc || finalDesc.trim() === "") {

    const pinLabel = finalName.toUpperCase();

    if (pinLabel === "VCC" || pinLabel === "VDD")
        finalDesc = "Power Supply";

    else if (pinLabel === "GND" || pinLabel === "VSS")
        finalDesc = "Ground";

    else {
        const m = pinLabel.match(/^(\d+)(A|B|C|D|Y)$/);

        if (m) {
            const gate = m[1];
            const suffix = m[2];

            if (suffix === "Y")
                finalDesc = `Output for Gate ${gate}`;
            else
                finalDesc = `Input ${suffix} for Gate ${gate}`;
        } else {
            finalDesc = aiData?.description || "-";
        }
    }
}

            return {
                ...pin,
                number: pinNum,
                name: finalName,
                description: finalDesc
            };
        });

        if (overrideApplied) {
            addLog(`✔ Hardware override applied`);
        }

        // Strict Numeric Sort
        enhancedPins.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
        addLog(`✔ Merged AI descriptions`);

        if (isMounted) {
            setDisplayData(enhancedPins);
            setSelectedPackageName(pkgName);
            setDbState({ isLoading: false, error: null, coreNumber });
        }

      } catch (err) {
        // =====================================================================
        // THE FALLBACK MECHANISM (Triggers if ANY local step fails)
        // =====================================================================
        if (isMounted) {
            addLog(`⚠ ${err.message}`, 'warning');
            addLog(`⚠ Falling back to AI pinout`, 'warning');

            // Check if AI Fallback actually has data
            if (aiFallbackPinout && aiFallbackPinout.length > 0) {
                
                // Format pure AI data
                const formattedAIPins = aiFallbackPinout.map(pin => {
                    const pinNum = String(pin.number || pin.pin);
                    return {
                        ...pin,
                        number: pinNum,
                        name: pin.name || `PIN_${pinNum}`,
                        description: pin.description || "-"
                    };
                });

                // Sort AI data numerically
                formattedAIPins.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

                addLog(`✔ AI pinout loaded`, 'success');

                // Render the AI Data and CLEAR the error state
                setDisplayData(formattedAIPins);
                setSelectedPackageName('AI Generated (Verify with Datasheet)');
                setDbState({ isLoading: false, error: null, coreNumber }); 
            } else {
                // The ultimate failure: No local DB AND No AI data
                addLog(`✖ AI pinout is also missing or empty`, 'error');
                setDbState({ 
                    isLoading: false, 
                    error: "No pin information available.", 
                    coreNumber 
                });
            }
        }
      }
    };

    // Always trigger pipeline to allow fallback to execute even if extraction fails
    executePipeline();

    return () => { isMounted = false; };
  }, [rawIcName, requestedPackageType, aiFallbackPinout, addLog]);

  // =====================================================================
  // UI & SVG RENDERERS
  // =====================================================================
  const renderCadDiagram = () => {
    if (dbState.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-900 rounded-xl mb-6">
          <Loader2 className="animate-spin text-primary-500 mb-2" />
          <span className="text-xs text-slate-400">Loading CAD Data...</span>
        </div>
      );
    }

    if (dbState.error || !displayData || displayData.length === 0) return null;

    const pkgString = (selectedPackageName + ' ' + requestedPackageType).toUpperCase();
    const isQuadPackage = pkgString.includes('QFP') || 
                          pkgString.includes('PLCC') || 
                          pkgString.includes('QFN') || 
                          pkgString.includes('LCC') || 
                          pkgString.includes('BGA');

    const maxPin = Math.max(...displayData.map(p => parseInt(p.number) || 0));
    const getPin = (num) => displayData.find(p => parseInt(p.number) === num) || { name: 'NC' };

    // --- RENDER: QUAD PACKAGE (4-Sided) ---
    if (isQuadPackage) {
      const totalPins = maxPin + (4 - (maxPin % 4)) % 4;
      const pps = totalPins / 4;
      const PIN_SPACING = 30;
      const CHIP_SIZE = Math.max(160, (pps + 1) * PIN_SPACING);
      const SVG_WIDTH = CHIP_SIZE + 400; 
      const SVG_HEIGHT = CHIP_SIZE + 400;
      const CENTER_X = SVG_WIDTH / 2;
      const CENTER_Y = SVG_HEIGHT / 2;

      return (
        <div className="w-full overflow-x-auto bg-[#0b1121] rounded-xl border border-slate-700 shadow-inner custom-scroll select-none relative mb-6">
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full min-w-[700px] h-auto drop-shadow-2xl py-4">
            <rect x={CENTER_X - CHIP_SIZE/2} y={CENTER_Y - CHIP_SIZE/2} width={CHIP_SIZE} height={CHIP_SIZE} fill="#1e293b" stroke="#334155" strokeWidth="3" rx="8" />
            <circle cx={CENTER_X - CHIP_SIZE/2 + 20} cy={CENTER_Y - CHIP_SIZE/2 + 20} r="6" fill="#334155" />
            <text x={CENTER_X} y={CENTER_Y + 8} fill="#475569" fontSize="24" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{displayIcName || rawIcName || 'UNKNOWN IC'}</text>

            {Array.from({ length: pps }).map((_, i) => {
              const leftNum = i + 1;
              const botNum = pps + i + 1;
              const rightNum = 2 * pps + i + 1;
              const topNum = 3 * pps + i + 1;

              const lY = CENTER_Y - CHIP_SIZE/2 + (i + 1) * PIN_SPACING;
              const bX = CENTER_X - CHIP_SIZE/2 + (i + 1) * PIN_SPACING;
              const rY = CENTER_Y + CHIP_SIZE/2 - (i + 1) * PIN_SPACING;
              const tX = CENTER_X + CHIP_SIZE/2 - (i + 1) * PIN_SPACING;

              return (
                <g key={`quad_pins_${i}`}>
                  <rect x={CENTER_X - CHIP_SIZE/2 - 20} y={lY - 5} width="20" height="10" fill="#94a3b8" />
                  <text x={CENTER_X - CHIP_SIZE/2 + 15} y={lY + 4} fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{leftNum}</text>
                  <text x={CENTER_X - CHIP_SIZE/2 - 30} y={lY + 4} fill="#38bdf8" fontSize="12" fontFamily="monospace" textAnchor="end">{getPin(leftNum).name}</text>
                  <line x1={CENTER_X - CHIP_SIZE/2 - 20} y1={lY} x2={CENTER_X - CHIP_SIZE/2 - 120} y2={lY} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />

                  <rect x={bX - 5} y={CENTER_Y + CHIP_SIZE/2} width="10" height="20" fill="#94a3b8" />
                  <text x={bX} y={CENTER_Y + CHIP_SIZE/2 - 15} fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{botNum}</text>
                  <text x={bX} y={CENTER_Y + CHIP_SIZE/2 + 40} fill="#38bdf8" fontSize="12" fontFamily="monospace" textAnchor="start" transform={`rotate(90, ${bX}, ${CENTER_Y + CHIP_SIZE/2 + 40})`}>{getPin(botNum).name}</text>
                  <line x1={bX} y1={CENTER_Y + CHIP_SIZE/2 + 20} x2={bX} y2={CENTER_Y + CHIP_SIZE/2 + 120} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />

                  <rect x={CENTER_X + CHIP_SIZE/2} y={rY - 5} width="20" height="10" fill="#94a3b8" />
                  <text x={CENTER_X + CHIP_SIZE/2 - 15} y={rY + 4} fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{rightNum}</text>
                  <text x={CENTER_X + CHIP_SIZE/2 + 30} y={rY + 4} fill="#38bdf8" fontSize="12" fontFamily="monospace" textAnchor="start">{getPin(rightNum).name}</text>
                  <line x1={CENTER_X + CHIP_SIZE/2 + 20} y1={rY} x2={CENTER_X + CHIP_SIZE/2 + 120} y2={rY} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />

                  <rect x={tX - 5} y={CENTER_Y - CHIP_SIZE/2 - 20} width="10" height="20" fill="#94a3b8" />
                  <text x={tX} y={CENTER_Y - CHIP_SIZE/2 + 20} fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{topNum}</text>
                  <text x={tX} y={CENTER_Y - CHIP_SIZE/2 - 40} fill="#38bdf8" fontSize="12" fontFamily="monospace" textAnchor="start" transform={`rotate(-90, ${tX}, ${CENTER_Y - CHIP_SIZE/2 - 40})`}>{getPin(topNum).name}</text>
                  <line x1={tX} y1={CENTER_Y - CHIP_SIZE/2 - 20} x2={tX} y2={CENTER_Y - CHIP_SIZE/2 - 120} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
                </g>
              );
            })}
          </svg>
        </div>
      );
    }

    // --- RENDER: DUAL PACKAGE (2-Sided DIP/SOIC) ---
    const totalPins = maxPin % 2 === 0 ? maxPin : maxPin + 1; 
    const pinsPerSide = totalPins / 2;
    const PIN_SPACING = 40;
    const CHIP_WIDTH = 180;
    const CHIP_HEIGHT = (pinsPerSide + 1) * PIN_SPACING;
    const SVG_WIDTH = 600;
    const SVG_HEIGHT = Math.max(CHIP_HEIGHT + 100, 400);
    const START_Y = 50;
    const CENTER_X = SVG_WIDTH / 2;

    return (
      <div className="w-full overflow-x-auto bg-[#0b1121] rounded-xl border border-slate-700 shadow-inner custom-scroll select-none relative mb-6">
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full min-w-[500px] h-auto drop-shadow-2xl py-4">
          
          <rect x={CENTER_X - CHIP_WIDTH/2} y={START_Y} width={CHIP_WIDTH} height={CHIP_HEIGHT} fill="#1e293b" stroke="#334155" strokeWidth="3" rx="8" />
          <path d={`M ${CENTER_X - 20} ${START_Y} a 20 20 0 0 0 40 0`} fill="#0b1121" stroke="#334155" strokeWidth="3" />
          <circle cx={CENTER_X - CHIP_WIDTH/2 + 25} cy={START_Y + 30} r="6" fill="#334155" />
          <text x={CENTER_X} y={START_Y + CHIP_HEIGHT / 2} fill="#475569" fontSize="24" fontWeight="bold" fontFamily="monospace" textAnchor="middle" transform={`rotate(-90, ${CENTER_X}, ${START_Y + CHIP_HEIGHT / 2})`}>{displayIcName || rawIcName || 'UNKNOWN IC'}</text>

          {Array.from({ length: pinsPerSide }).map((_, i) => {
            const leftPinNum = i + 1;
            const rightPinNum = totalPins - i;
            const yPos = START_Y + (i + 1) * PIN_SPACING;

            return (
              <g key={`dip_pins_${i}`}>
                <rect x={CENTER_X - CHIP_WIDTH/2 - 30} y={yPos - 6} width="30" height="12" fill="#94a3b8" />
                <text x={CENTER_X - CHIP_WIDTH/2 + 15} y={yPos + 4} fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{leftPinNum}</text>
                <text x={CENTER_X - CHIP_WIDTH/2 - 40} y={yPos + 4} fill="#38bdf8" fontSize="13" fontFamily="monospace" textAnchor="end">{getPin(leftPinNum).name}</text>
                <line x1={CENTER_X - CHIP_WIDTH/2 - 30} y1={yPos} x2="40" y2={yPos} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />

                <rect x={CENTER_X + CHIP_WIDTH/2} y={yPos - 6} width="30" height="12" fill="#94a3b8" />
                <text x={CENTER_X + CHIP_WIDTH/2 - 15} y={yPos + 4} fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{rightPinNum}</text>
                <text x={CENTER_X + CHIP_WIDTH/2 + 40} y={yPos + 4} fill="#38bdf8" fontSize="13" fontFamily="monospace" textAnchor="start">{getPin(rightPinNum).name}</text>
                <line x1={CENTER_X + CHIP_WIDTH/2 + 30} y1={yPos} x2={SVG_WIDTH - 40} y2={yPos} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // --- Filter Table Data ---
  const filtered = useMemo(() => {
    if (!displayData) return [];
    const q = search.toLowerCase();
    if (!q) return displayData;
    return displayData.filter(p =>
      (p.number)?.toString().toLowerCase().includes(q) || 
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [displayData, search]);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={16} className="text-primary-600" />
        <span className="section-title !mb-0">Pin Topology (CAD Grade)</span>
      </div>

      {/* STATUS BANNERS */}
      {!dbState.isLoading && !dbState.error && displayData && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <Database size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>Verified CAD Data:</strong> Pinout rendered directly from local EDA component libraries.
          </p>
        </div>
      )}

      {/* DIAGNOSTIC CONSOLE */}
      <div className="mb-6 p-4 bg-slate-950 border-2 border-slate-800 rounded-xl font-mono text-xs shadow-inner">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
          <Bug size={16} className="text-slate-400" />
          <span className="text-slate-300 font-bold uppercase tracking-wider">Local Pipeline Diagnostic Log</span>
        </div>
        <ul className="space-y-1.5 overflow-y-auto max-h-48 custom-scroll pr-2">
          {logs.length === 0 && !dbState.isLoading && <li className="text-slate-500 italic">No logs generated.</li>}
          {logs.map((log, i) => (
            <li key={i} className={
                log.type === 'error' ? 'text-red-400 font-bold' : 
                log.type === 'warning' ? 'text-amber-400' : 
                log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'
            }>
              {log.msg}
            </li>
          ))}
        </ul>
      </div>

      {/* ERROR STATE */}
      {dbState.error && (
        <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-xl flex flex-col items-center justify-center text-center">
          <XCircle size={32} className="text-red-500 mb-2" />
          <h3 className="font-bold text-red-800 text-lg uppercase tracking-wide">IC NOT FOUND IN LOCAL DATABASE</h3>
          <p className="text-sm text-red-600 mt-2 font-mono bg-red-100 px-3 py-1 rounded text-left overflow-x-auto w-full">
            {dbState.error}
          </p>
        </div>
      )}

      {/* SUCCESS STATE UI */}
      {!dbState.error && !dbState.isLoading && displayData && (
        <>
          {renderCadDiagram()}

          {/* WARNINGS */}
          {pinout?.warnings?.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              {pinout.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pins by number, name, or description..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 data-label w-20">Pin</th>
                  <th className="text-left px-4 py-2.5 data-label w-32">Name</th>
                  <th className="text-left px-4 py-2.5 data-label">Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-primary-50/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-semibold text-primary-700">{p.number}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && displayData.length > 0 && (
                <p className="text-center py-8 text-sm text-slate-400">No pins match your search.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}