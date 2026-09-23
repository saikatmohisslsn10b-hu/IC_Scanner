import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { extractICNumber, getStandardPinName } from './PinTopologyTab';

// =====================================================================
// Locate an IC number anywhere inside the report object
// (mirrors the helper used in PinTopologyTab.jsx / ICViewer3DTab.jsx)
// =====================================================================
function findICNumberInReport(obj) {
  if (!obj) return null;
  const regex =
    /\b(?:SN)?(?:74(?:HC|HCT|LS|ALS|F|S|AC|ACT)?\d+|CD40\d{2}|HEF40\d{2}|HCF40\d{2}|40\d{2}|14\d{3})\b/i;

  const walk = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const m = value.match(regex);
      if (m) return m[0].replace(/^SN/i, '');
      return null;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        const r = walk(v);
        if (r) return r;
      }
    }
    if (typeof value === 'object') {
      for (const k of Object.keys(value)) {
        const r = walk(value[k]);
        if (r) return r;
      }
    }
    return null;
  };

  return walk(obj);
}

// =====================================================================
// Fetch the SAME verified local-DB pinout used by PinTopologyTab /
// ICViewer3DTab (master index -> category file -> hardware override -> AI fallback)
// =====================================================================
function useVerifiedPinout(report) {
  const [pins, setPins] = useState(null); // null = still resolving

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const displayIcName =
        report?.identification?.number || report?.identification?.name || '';
      const rawIcName = findICNumberInReport(report) || displayIcName;
      const requestedPackageType = report?.packageType || '';
      const aiFallbackPinout = report?.pinout?.table || [];

      const coreNumber = extractICNumber(rawIcName);

      try {
        if (!coreNumber) throw new Error('no core number');

        const indexRes = await fetch('/json_database/master_search_index.json');
        if (!indexRes.ok) throw new Error('index missing');
        const index = await indexRes.json();

        const targetFilePrefix = index[coreNumber];
        if (!targetFilePrefix) throw new Error('not in index');

        const symbolRes = await fetch(`/json_database/${targetFilePrefix}.json`);
        if (!symbolRes.ok) throw new Error('category missing');
        const symbolLibrary = await symbolRes.json();

        const icData = symbolLibrary[coreNumber];
        if (!icData) throw new Error('ic missing');

        let rawPins = [];
        const packages = icData.packages || [];

        if (packages.length > 0) {
          let targetPackage = packages[0];
          if (requestedPackageType) {
            const reqType = requestedPackageType.toUpperCase();
            const match = packages.find(
              (p) => p.package && p.package.toUpperCase().includes(reqType)
            );
            if (match) targetPackage = match;
          }
          rawPins = targetPackage.pins || [];
        } else if (icData.pins && icData.pins.length > 0) {
          rawPins = icData.pins;
        }

        if (rawPins.length === 0) throw new Error('no pins');

        const enhancedPins = rawPins.map((pin) => {
          const pinNum = String(pin.number || pin.pin);
          const aiData = aiFallbackPinout.find(
            (ap) => String(ap.number || ap.pin) === pinNum
          );

          const hwOverrideName = getStandardPinName(coreNumber, pinNum);
          let finalName;
          if (hwOverrideName) {
            finalName = hwOverrideName;
          } else {
            finalName = pin.name;
            if (!finalName || finalName.trim() === '' || finalName === '~') {
              finalName = `PIN_${pinNum}`;
            }
          }

          return { ...pin, number: pinNum, name: finalName, description: pin.description || aiData?.description || '-' };
        });

        enhancedPins.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

        if (isMounted) setPins(enhancedPins);
      } catch (err) {
        if (isMounted) {
          if (aiFallbackPinout && aiFallbackPinout.length > 0) {
            const formatted = aiFallbackPinout.map((pin) => {
              const pinNum = String(pin.number || pin.pin);
              return {
                ...pin,
                number: pinNum,
                name: pin.name || `PIN_${pinNum}`,
                description: pin.description || '-',
              };
            });
            formatted.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
            setPins(formatted);
          } else {
            setPins([]);
          }
        }
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [report]);

  return pins;
}

// =====================================================================
// Gate-type text ("NAND Gate", "Hex Inverter" etc.) -> canonical logic op
// =====================================================================
function normalizeGateType(t) {
  const s = (t || '').toUpperCase();
  if (s.includes('XNOR')) return 'XNOR';
  if (s.includes('NAND')) return 'NAND';
  if (s.includes('NOR')) return 'NOR';
  if (s.includes('XOR')) return 'XOR';
  if (s.includes('AND')) return 'AND';
  if (s.includes('OR')) return 'OR';
  if (s.includes('NOT') || s.includes('INV')) return 'NOT';
  if (s.includes('BUFF')) return 'BUFFER';
  return 'AND';
}

function evaluateLogic(inputs, type) {
  if (!inputs || inputs.length === 0) return 0;
  switch (type) {
    case 'AND': return inputs.every((v) => v === 1) ? 1 : 0;
    case 'OR': return inputs.some((v) => v === 1) ? 1 : 0;
    case 'NAND': return inputs.every((v) => v === 1) ? 0 : 1;
    case 'NOR': return inputs.some((v) => v === 1) ? 0 : 1;
    case 'XOR': return inputs.reduce((a, b) => a ^ b, 0);
    case 'XNOR': return inputs.reduce((a, b) => a ^ b, 0) ? 0 : 1;
    case 'NOT': return inputs[0] ? 0 : 1;
    case 'BUFFER': return inputs[0] ? 1 : 0;
    default: return inputs.every((v) => v === 1) ? 1 : 0;
  }
}

// --- Wire color semantics (requested): GND=black, VCC=red, input=blue, output=green
const WIRE_COLORS = {
  vcc: '#ef4444',
  gnd: '#000000',
  input: '#3b82f6',
  output: '#22c55e',
  generic: '#f59e0b',
};

function classifyNet(netId) {
  if (!netId) return null;
  if (netId === 'SRC_5V' || netId.includes('RAIL_T_VCC') || netId.includes('RAIL_B_VCC')) return 'vcc';
  if (netId === 'SRC_GND' || netId.includes('RAIL_B_GND') || netId.includes('RAIL_T_GND')) return 'gnd';
  if (netId.startsWith('SRC_SW_')) return 'input';
  if (netId.startsWith('DEST_LED_')) return 'output';
  return null;
}

const HOLE_SPACING = 15;
const BB_START_X = 270;
const IC_START_COL = 10; 
const IC_Y = 250;
const IC_HEIGHT = 60;

// Inner-most hole rows that the IC legs plug into
const PIN_TOP_Y = 245;
const PIN_BOTTOM_Y = 315;

export default function InteractiveBreadboard({ report, mode }) {
  const pinout = report?.pinout?.table || [];
  const icName = report?.identification?.name || 'IC';
  const icPartNumber = report?.identification?.number || icName; // part number, not name
  const gateType = normalizeGateType(
    report?.logicInfo?.gateType || report?.logicInfo?.humanReadableLogicType || 'AND'
  );

  const BOARD_W = 1000;
  const BOARD_H = 650;

  // State
  const [customWires, setCustomWires] = useState([]);
  const [drawingWire, setDrawingWire] = useState(null);
  const [switches, setSwitches] = useState([0, 0, 0, 0]);
  const [leds, setLeds] = useState([0, 0, 0, 0]);
  const svgRef = useRef(null);

  // Real, verified pinout for THIS specific IC (1A/1B/1Y, VCC, GND, etc.)
  const verifiedPins = useVerifiedPinout(report);

  // Pin count is dynamic (14 / 16 / 20 / 24 / 28 / 40 ...)
  const { totalPins, pinsPerSide } = useMemo(() => {
    const list = (verifiedPins && verifiedPins.length > 0) ? verifiedPins : pinout;
    const maxPin = list && list.length > 0
      ? Math.max(...list.map((p) => parseInt(p.number || p.pin, 10) || 0))
      : 14;
    const safeMax = maxPin > 0 ? maxPin : 14;
    const total = safeMax % 2 === 0 ? safeMax : safeMax + 1;
    return { totalPins: total, pinsPerSide: total / 2 };
  }, [verifiedPins, pinout]);

  const columnX = (col) => BB_START_X + col * HOLE_SPACING;

  // dynamic pin -> breadboard net/column, works for any pin count
  const pinWireEndpoint = (pinNum) => {
  const p = parseInt(pinNum, 10);
  if (!p) return null;

  // Leave one free hole between the IC leg and the jumper wire.
  // Pins 1-7 (bottom side) -> use the row just BELOW the IC.
  if (p <= pinsPerSide) {
    const col = IC_START_COL + (p - 1);

    return {
      x: columnX(col),
      y: PIN_BOTTOM_Y + 15,
      net: `BB_COL_B_${col}`,
    };
  }

  // Pins 8-14 (top side) -> use the row just ABOVE the IC.
  const i = totalPins - p;
  const col = IC_START_COL + i;

  return {
    x: columnX(col),
    y: PIN_TOP_Y - 15,
    net: `BB_COL_T_${col}`,
  };
};
  const pinToNet = (pinNum) => pinWireEndpoint(pinNum)?.net || null;

  // --- Parse verified pins into per-gate {inputs, output} structure ---
  // Only recognizes simple combinational logic-gate pin naming (1A/1B/1Y, 2A/2B/2Y...).
  // Sequential/complex ICs (counters, shift registers, decoders, flip-flops) use
  // different pin naming (CLK, Q0, SER, OE...) and are intentionally NOT guessed at.
  const gates = useMemo(() => {
    const g = {};
    (verifiedPins || []).forEach((pin) => {
      const nm = (pin.name || '').toUpperCase().trim();
      const m = nm.match(/^(\d+)([ABCD]|Y)$/);
      if (!m) return;
      const gateNum = m[1];
      const role = m[2];
      if (!g[gateNum]) g[gateNum] = { inputs: [], output: null };
      if (role === 'Y') g[gateNum].output = pin.number;
      else g[gateNum].inputs.push(pin.number);
    });
    Object.values(g).forEach((gate) => gate.inputs.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)));
    return g;
  }, [verifiedPins]);

  const powerPin = useMemo(() => {
    const p = (verifiedPins || []).find((p) => ['VCC', 'VDD'].includes((p.name || '').toUpperCase()));
    return p ? p.number : String(totalPins);
  }, [verifiedPins, totalPins]);

  const gndPin = useMemo(() => {
    const p = (verifiedPins || []).find((p) => ['GND', 'VSS'].includes((p.name || '').toUpperCase()));
    return p ? p.number : String(pinsPerSide);
  }, [verifiedPins, pinsPerSide]);

  const hasVerifiedData = !!(verifiedPins && verifiedPins.length > 0);
  const gatesFound = Object.keys(gates).length > 0;
  // True when we DO have real pin data for this IC, but none of its pins match
  // the simple-gate naming pattern -> it's a sequential/complex IC we shouldn't
  // guess wiring for (e.g. shift registers, counters, decoders, flip-flops).
  const isUnsupportedIC = hasVerifiedData && !gatesFound;

  const effectiveGates = useMemo(() => {
    if (gatesFound) return gates;
    if (hasVerifiedData) return {}; // unsupported IC type - don't fabricate wiring
    return { '1': { inputs: ['1', '2'], output: '3' } }; // still loading - safe generic default
  }, [gates, gatesFound, hasVerifiedData]);

  // --- Auto-Mode wires, generated from THIS IC's real gate #1 (1 input for a
  // NOT gate, 2 for AND/NAND/OR/NOR/XOR, etc.) and its real VCC/GND pins.
  const dynamicPresetWires = useMemo(() => {
    const gateKeys = Object.keys(effectiveGates).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const firstGate = gateKeys.length ? effectiveGates[gateKeys[0]] : null;
    if (!firstGate || !firstGate.output || firstGate.inputs.length === 0) return [];

    const wires = [];
    const railTopCol = IC_START_COL;
    const railBotCol = IC_START_COL + pinsPerSide - 1;

    // Power (5V source -> top rail -> real VCC/VDD pin of THIS IC) — RED
    // Power (5V source -> top rail -> real VCC/VDD pin of THIS IC) — RED
    // Power (5V source -> top rail -> real VCC/VDD pin of THIS IC) — RED
    const vccEnd = pinWireEndpoint(powerPin);
    if (vccEnd) {
      wires.push({ id: 'pw_src', start: { x: 90, y: 95, net: 'SRC_5V' }, end: { x: columnX(railTopCol), y: 140, net: 'BB_RAIL_T_VCC' }, color: WIRE_COLORS.vcc });
      wires.push({ id: 'pw_pin', start: { x: columnX(railTopCol), y: 140, net: 'BB_RAIL_T_VCC' }, end: vccEnd, color: WIRE_COLORS.vcc });
    }

    // Ground (GND source -> bottom rail -> real GND/VSS pin of THIS IC) — BLACK
    const gndEnd = pinWireEndpoint(gndPin);
    if (gndEnd) {
      wires.push({ id: 'gw_src', start: { x: 170, y: 95, net: 'SRC_GND' }, end: { x: columnX(railBotCol), y: 405, net: 'BB_RAIL_B_GND' }, color: WIRE_COLORS.gnd });
      wires.push({ id: 'gw_pin', start: { x: columnX(railBotCol), y: 405, net: 'BB_RAIL_B_GND' }, end: gndEnd, color: WIRE_COLORS.gnd });
    }

    // Inputs: one switch per real input of gate 1 — BLUE
    firstGate.inputs.forEach((pinNum, idx) => {
      if (idx >= 4) return; // board only has 4 switches
      const end = pinWireEndpoint(pinNum);
      if (!end) return;
      wires.push({
        id: `sw_${idx}`,
        start: { x: 180, y: 292 + idx * 70, net: `SRC_SW_${idx + 1}` },
        end,
        color: WIRE_COLORS.input,
      });
    });

    // Output: gate 1's real output pin -> LED1 — GREEN
    const outEnd = pinWireEndpoint(firstGate.output);
    if (outEnd) {
      wires.push({ id: 'out_0', start: outEnd, end: { x: 840, y: 292, net: 'DEST_LED_1' }, color: WIRE_COLORS.output });
    }

    return wires;
  }, [effectiveGates, powerPin, gndPin, totalPins, pinsPerSide]);

  const activeWires = mode === 'auto' ? dynamicPresetWires : customWires;

  // --- Breadboard Electrical Logic Engine ---
  useEffect(() => {
    const resolveNet = (targetNet, visited = new Set(), icOutputs = {}) => {
      if (!targetNet || visited.has(targetNet)) return 0;
      visited.add(targetNet);

      if (targetNet === 'SRC_5V') return 1;
      if (targetNet === 'SRC_GND') return 0;
      if (targetNet.startsWith('SRC_SW_')) {
        const idx = parseInt(targetNet.replace('SRC_SW_', '')) - 1;
        return switches[idx];
      }
      if (targetNet in icOutputs) return icOutputs[targetNet];

      const connectedWires = activeWires.filter(w => w.start.net === targetNet || w.end.net === targetNet);
      for (let wire of connectedWires) {
        const nextNet = wire.start.net === targetNet ? wire.end.net : wire.start.net;
        if (resolveNet(nextNet, visited, icOutputs) === 1) return 1;
      }
      return 0;
    };

    const hasPower = resolveNet(pinToNet(powerPin)) === 1;

    const icOutputs = {};
    if (hasPower) {
      Object.values(effectiveGates).forEach((gate) => {
        if (!gate.output || gate.inputs.length === 0) return;
        const inputVals = gate.inputs.map((pinNum) => resolveNet(pinToNet(pinNum), new Set(), icOutputs));
        icOutputs[pinToNet(gate.output)] = evaluateLogic(inputVals, gateType);
      });
    }

    setLeds([
      resolveNet('DEST_LED_1', new Set(), icOutputs),
      resolveNet('DEST_LED_2', new Set(), icOutputs),
      resolveNet('DEST_LED_3', new Set(), icOutputs),
      resolveNet('DEST_LED_4', new Set(), icOutputs)
    ]);

  }, [switches, activeWires, gateType, effectiveGates, powerPin, totalPins, pinsPerSide]);


  // --- Wiring Interactions ---
  const getMouseCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const handlePointerDown = (e, netId, cx, cy) => {
    if (mode === 'auto') return;
    e.stopPropagation();
    setDrawingWire({ start: { x: cx, y: cy, net: netId }, current: { x: cx, y: cy }, color: '#fbbf24' });
  };

  const handlePointerMove = (e) => {
    if (!drawingWire || mode === 'auto') return;
    setDrawingWire({ ...drawingWire, current: getMouseCoords(e) });
  };

  const handlePointerUpHole = (e, netId, cx, cy) => {
    if (!drawingWire || mode === 'auto') return;
    e.stopPropagation();

    if (drawingWire.start.net !== netId) {
      // Color the wire by what it's actually connected to: GND=black, VCC=red,
      // input/switch=blue, output/LED=green; generic hole-to-hole = amber.
      const startKind = classifyNet(drawingWire.start.net);
      const endKind = classifyNet(netId);
      const kind = startKind || endKind;
      const color = kind ? WIRE_COLORS[kind] : WIRE_COLORS.generic;

      setCustomWires([...customWires, {
        id: `w_${Date.now()}`, start: drawingWire.start, end: { x: cx, y: cy, net: netId },
        color,
      }]);
    }
    setDrawingWire(null);
  };

  // --- SVG Generators ---
  const renderBreadboardRow = (yOffset, netPrefix, startCol = 1, cols = 30) => {
    let holes = [];
    for (let i = 0; i < cols; i++) {
      const colNum = startCol + i;
      const cx = BB_START_X + (colNum * HOLE_SPACING);
      const netId = netPrefix.includes('RAIL') ? netPrefix : `${netPrefix}_${colNum}`;

      holes.push(
        <circle key={`${netId}_${yOffset}`} cx={cx} cy={yOffset} r={4}
          className="fill-slate-800 hover:fill-primary-500 transition-all cursor-crosshair stroke-slate-600 stroke-[0.5]"
          onPointerDown={(e) => handlePointerDown(e, netId, cx, yOffset)}
          onPointerUp={(e) => handlePointerUpHole(e, netId, cx, yOffset)}
        />
      );
    }
    return holes;
  };

  const renderWires = () => activeWires.map(wire => (
    <path key={wire.id} d={`M ${wire.start.x} ${wire.start.y} Q ${(wire.start.x + wire.end.x)/2} ${(wire.start.y + wire.end.y)/2 + 40} ${wire.end.x} ${wire.end.y}`}
      fill="none" stroke={wire.color} strokeWidth="5" strokeLinecap="round" className="drop-shadow-lg" />
  ));

  // IC body position, width and label center, all dynamic
  const IC_X = columnX(IC_START_COL) - HOLE_SPACING / 2;
  const IC_WIDTH = pinsPerSide * HOLE_SPACING;

  return (
    <div className="flex flex-col gap-4">
      {mode === 'custom' && (
        <div className="flex justify-end p-3 bg-slate-900 rounded-xl">
          <button onClick={() => { setCustomWires([]); setLeds([0,0,0,0]); setSwitches([0,0,0,0]); }} className="px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1">
            <Trash2 size={14} /> Clear Board
          </button>
        </div>
      )}

      {isUnsupportedIC && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Auto-wiring unavailable for this IC.</strong> Its pins don't match a simple logic-gate pattern (AND/OR/NAND/NOR/XOR/XNOR/NOT), so the simulator won't guess a connection. Use Build Your Own mode and the Pinout tab to wire it manually.
          </p>
        </div>
      )}

      <div className="w-full overflow-x-auto bg-slate-100 rounded-xl border-4 border-slate-300 shadow-inner select-none">
        <svg ref={svgRef} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-full min-w-[1000px] touch-none"
          onPointerMove={handlePointerMove} onPointerUp={() => setDrawingWire(null)} onPointerLeave={() => setDrawingWire(null)}>

          <rect width="100%" height="100%" fill="#881337" rx="8" />

          {/* 1. POWER MODULE */}
          <g transform="translate(40, 40)">
            <rect width="180" height="80" fill="#4c0519" rx="6" stroke="#fb7185" strokeWidth="2" />
            <text x="90" y="25" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">DC POWER</text>

            <circle cx="50" cy="55" r="12" fill="#ef4444" stroke="#991b1b" strokeWidth="3" />
            <circle cx="50" cy="55" r="4" fill="#000" className="cursor-crosshair hover:fill-yellow-400"
              onPointerDown={(e) => handlePointerDown(e, 'SRC_5V', 90, 95)} onPointerUp={(e) => handlePointerUpHole(e, 'SRC_5V', 90, 95)} />
            <text x="50" y="85" fill="#fff" fontSize="12" textAnchor="middle">+5V</text>

            <circle cx="130" cy="55" r="12" fill="#000" stroke="#333" strokeWidth="3" />
            <circle cx="130" cy="55" r="4" fill="#666" className="cursor-crosshair hover:fill-yellow-400"
              onPointerDown={(e) => handlePointerDown(e, 'SRC_GND', 170, 95)} onPointerUp={(e) => handlePointerUpHole(e, 'SRC_GND', 170, 95)} />
            <text x="130" y="85" fill="#fff" fontSize="12" textAnchor="middle">GND</text>
          </g>

          {/* 2. SWITCHES MODULE */}
          <g transform="translate(40, 200)">
            <rect width="180" height="350" fill="#4c0519" rx="6" stroke="#fb7185" strokeWidth="2" />
            <text x="90" y="30" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">LOGIC INPUTS</text>

            {switches.map((state, i) => (
              <g key={`sw_${i}`}>
                <rect x="30" y={80 + (i * 70)} width="40" height="24" fill="#333" rx="4" />
                <rect x={state ? 50 : 32} y={82 + (i * 70)} width="18" height="20" fill={state ? "#ef4444" : "#94a3b8"} rx="2"
                  className="cursor-pointer transition-all" onClick={() => {const s=[...switches]; s[i]=s[i]===0?1:0; setSwitches(s);}} />
                <text x="50" y={75 + (i * 70)} fill="#f87171" fontSize="10" textAnchor="middle">SW{i+1}</text>

                <circle cx="140" cy={92 + (i * 70)} r="10" fill="#222" stroke="#555" strokeWidth="2" />
                <circle cx="140" cy={92 + (i * 70)} r="4" fill="#000" className="cursor-crosshair hover:fill-yellow-400"
                  onPointerDown={(e) => handlePointerDown(e, `SRC_SW_${i+1}`, 180, 292 + (i * 70))} onPointerUp={(e) => handlePointerUpHole(e, `SRC_SW_${i+1}`, 180, 292 + (i * 70))} />
              </g>
            ))}
          </g>

          {/* 3. LED MODULE */}
          <g transform="translate(800, 200)">
            <rect width="160" height="350" fill="#4c0519" rx="6" stroke="#fb7185" strokeWidth="2" />
            <text x="80" y="30" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">LOGIC OUTPUTS</text>

            {leds.map((state, i) => (
              <g key={`led_${i}`}>
                <circle cx="40" cy={92 + (i * 70)} r="10" fill="#222" stroke="#555" strokeWidth="2" />
                <circle cx="40" cy={92 + (i * 70)} r="4" fill="#000" className="cursor-crosshair hover:fill-yellow-400"
                  onPointerDown={(e) => handlePointerDown(e, `DEST_LED_${i+1}`, 840, 292 + (i * 70))} onPointerUp={(e) => handlePointerUpHole(e, `DEST_LED_${i+1}`, 840, 292 + (i * 70))} />
                <circle cx="110" cy={92 + (i * 70)} r="14" fill={state ? "#22c55e" : "#1e293b"} stroke={state ? "#4ade80" : "#0f172a"} strokeWidth="3" />
                <text x="110" y={72 + (i * 70)} fill="#f87171" fontSize="10" textAnchor="middle">L{i+1}</text>
              </g>
            ))}
          </g>

          {/* 4. CENTER BREADBOARD */}
          <g transform={`translate(0, 0)`}>
            <rect x={BB_START_X - 15} y={110} width={30 * HOLE_SPACING + 30} height="340" fill="#f4f4f0" rx="8" />
            <rect
                x={BB_START_X}
                y={260}
                width={30 * HOLE_SPACING}
                height="40"
                fill="#d1d1ca"
                rx="2"
            />

            <line x1={BB_START_X} y1={125} x2={BB_START_X + 30 * HOLE_SPACING} y2={125} stroke="#ef4444" strokeWidth="3" />
            <line x1={BB_START_X} y1={170} x2={BB_START_X + 30 * HOLE_SPACING} y2={170} stroke="#3b82f6" strokeWidth="3" />
            <line x1={BB_START_X} y1={390} x2={BB_START_X + 30 * HOLE_SPACING} y2={390} stroke="#3b82f6" strokeWidth="3" />
            <line x1={BB_START_X} y1={435} x2={BB_START_X + 30 * HOLE_SPACING} y2={435} stroke="#ef4444" strokeWidth="3" />

            {renderBreadboardRow(140, 'BB_RAIL_T_VCC')}
            {renderBreadboardRow(155, 'BB_RAIL_T_GND')}

            {renderBreadboardRow(185, 'BB_COL_T')}
            {renderBreadboardRow(200, 'BB_COL_T')}
            {renderBreadboardRow(215, 'BB_COL_T')}
            {renderBreadboardRow(230, 'BB_COL_T')}
            {renderBreadboardRow(245, 'BB_COL_T')}

            {renderBreadboardRow(315, 'BB_COL_B')}
            {renderBreadboardRow(330, 'BB_COL_B')}
            {renderBreadboardRow(345, 'BB_COL_B')}
            {renderBreadboardRow(360, 'BB_COL_B')}
            {renderBreadboardRow(375, 'BB_COL_B')}

            {renderBreadboardRow(405, 'BB_RAIL_B_GND')}
            {renderBreadboardRow(420, 'BB_RAIL_B_VCC')}

            {/* WIRES — rendered BEFORE the IC chip so the chip sits visually on
                top (real ICs cover the holes their legs plug into) instead of
                wires floating above the chip body. */}
            {renderWires()}

            {/* IC CHIP — size, position and pin labels all scale with the real pin count */}
            <g id="ic-chip" transform={`translate(${IC_X}, ${IC_Y})`}>
              {/* Top Legs */}
              {Array.from({ length: pinsPerSide }).map((_, i) => (
                <line
                  key={`top-leg-${i}`}
                  x1={i * HOLE_SPACING + 7.5}
                  y1={0}
                  x2={i * HOLE_SPACING + 7.5}
                  y2={-5}
                  stroke="#cfcfcf"
                  strokeWidth="2"
                />
              ))}

              {/* Bottom Legs */}
              {Array.from({ length: pinsPerSide }).map((_, i) => (
                <line
                  key={`bottom-leg-${i}`}
                  x1={i * HOLE_SPACING + 7.5}
                  y1={IC_HEIGHT}
                  x2={i * HOLE_SPACING + 7.5}
                  y2={IC_HEIGHT + 5}
                  stroke="#cfcfcf"
                  strokeWidth="2"
                />
              ))}

              {/* IC Body */}
              <rect
                width={IC_WIDTH}
                height={IC_HEIGHT}
                fill="#111"
                rx="3"
              />
              <circle cx="10" cy="30" r="4" fill="#333" />
              <text x={IC_WIDTH / 2} y="34" fill="#ddd" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                {icPartNumber}
              </text>
              {Array.from({ length: pinsPerSide }).map((_, i) => (
  <React.Fragment key={`pin_labels_${i}`}>
    {/* Bottom Pin Number (1 → pinsPerSide) */}
    <text
      x={i * HOLE_SPACING + 7.5}
      y={IC_HEIGHT - 4}
      fill="#fbbf24"
      fontSize="9"
      fontWeight="bold"
      fontFamily="monospace"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {i + 1}
    </text>

    {/* Top Pin Number (totalPins → pinsPerSide+1) */}
    <text
      x={i * HOLE_SPACING + 7.5}
      y="8"
      fill="#fbbf24"
      fontSize="9"
      fontWeight="bold"
      fontFamily="monospace"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {totalPins - i}
    </text>
  </React.Fragment>
))}
            </g>
          </g>

          {/* In-progress wire being dragged — always rendered on top so it's visible */}
          {drawingWire && (
            <path d={`M ${drawingWire.start.x} ${drawingWire.start.y} Q ${(drawingWire.start.x + drawingWire.current.x)/2} ${(drawingWire.start.y + drawingWire.current.y)/2 + 40} ${drawingWire.current.x} ${drawingWire.current.y}`}
              fill="none" stroke={drawingWire.color} strokeWidth="5" strokeLinecap="round" strokeDasharray="6 6" />
          )}
        </svg>
      </div>
    </div>
  );
}