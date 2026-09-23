import React, { useRef, useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, ContactShadows, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Box, RotateCw, Settings2, RefreshCcw } from 'lucide-react';
import { parsePinCount, getPinsPerSide } from '../../utils/helpers';
import { extractICNumber, getStandardPinName } from './PinTopologyTab';

// =====================================================================
// NEW: Locate an IC number anywhere inside the report object
// (mirrors the same helper used in PinTopologyTab.jsx)
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
// NEW: Fetch the SAME verified local-DB pinout used by PinTopologyTab
// (master index -> category file -> hardware override -> AI fallback)
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

          let finalDesc = pin.description;
          if (!finalDesc || finalDesc.trim() === '') {
            const pinLabel = finalName.toUpperCase();
            if (pinLabel === 'VCC' || pinLabel === 'VDD') {
              finalDesc = 'Power Supply';
            } else if (pinLabel === 'GND' || pinLabel === 'VSS') {
              finalDesc = 'Ground';
            } else {
              const m = pinLabel.match(/^(\d+)(A|B|C|D|Y)$/);
              if (m) {
                const gate = m[1];
                const suffix = m[2];
                finalDesc =
                  suffix === 'Y' ? `Output for Gate ${gate}` : `Input ${suffix} for Gate ${gate}`;
              } else {
                finalDesc = aiData?.description || '-';
              }
            }
          }

          return { ...pin, number: pinNum, name: finalName, description: finalDesc };
        });

        enhancedPins.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

        if (isMounted) setPins(enhancedPins);
      } catch (err) {
        // Same fallback behavior as PinTopologyTab: use AI pinout if local DB fails
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

// Dynamic line component
function DynamicLine({ labelPos, pinRef, color }) {
  const lineRef = useRef();

  useFrame(() => {
    if (lineRef.current && pinRef.current) {
      const pinWorldPos = new THREE.Vector3();
      pinRef.current.getWorldPosition(pinWorldPos);

      const positions = lineRef.current.geometry.attributes.position.array;
      positions[0] = labelPos.x;
      positions[1] = labelPos.y;
      positions[2] = labelPos.z;
      positions[3] = pinWorldPos.x;
      positions[4] = pinWorldPos.y;
      positions[5] = pinWorldPos.z;
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2} array={new Float32Array(6)} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={3} opacity={0.9} transparent={true} />
    </line>
  );
}

function ICScene({ pinCount, icName, pinTable, labelMode, resetTrigger }) {
  const { gl } = useThree();
  const icGroupRef = useRef();
  const resumeTimer = useRef(null);
  const autoRotate = useRef(true);

  const pinsPerSide = getPinsPerSide(pinCount);
  const bodyW = 0.7; 
  const bodyD = Math.max(0.6, pinsPerSide * 0.28); 
  const bodyH = 0.22; 
  const pinSpacing = bodyD / (pinsPerSide + 1);
  const pinW = 0.06;
  const pinH = 0.35;
  const pinD = 0.025;

  // Reset view
  useEffect(() => {
    if (icGroupRef.current) {
      icGroupRef.current.rotation.set(1.0, 0.5, 0);
      autoRotate.current = false;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => { autoRotate.current = true; }, 2000);
    }
  }, [resetTrigger]);

  // Manual drag rotation
  useEffect(() => {
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const canvas = gl.domElement;

    const onPointerDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      autoRotate.current = false;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };

    const onPointerMove = (e) => {
      if (isDragging && icGroupRef.current) {
        const deltaX = e.clientX - prevX;
        const deltaY = e.clientY - prevY;
        
        icGroupRef.current.rotation.y += deltaX * 0.01;
        icGroupRef.current.rotation.x += deltaY * 0.01;

        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      resumeTimer.current = setTimeout(() => { autoRotate.current = true; }, 3000);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl]);

  // Auto-rotation
  useFrame((_, delta) => {
    if (autoRotate.current && icGroupRef.current) {
      icGroupRef.current.rotation.y += delta * 0.1;
    }
  });

  // DYNAMICALLY determine pin types from verified pin data
  const getPinType = (pinData) => {
    const name = (pinData.name || '').toUpperCase();
    const desc = (pinData.description || '').toUpperCase();
    const type = (pinData.type || '').toLowerCase();
    
    // Check explicit type field first (if AI provided it)
    if (type === 'power' || type === 'vcc' || type === 'gnd') {
      if (name.includes('GND') || name === 'GND' || type === 'gnd') return 'gnd';
      return 'vcc';
    }
    
    // Check name and description
    if (name.includes('GND') || name.includes('GROUND') || desc.includes('GROUND')) {
      return 'gnd';
    }
    if (name.includes('VCC') || name.includes('V+') || name.includes('VDD') || 
        name.includes('POWER') || desc.includes('POWER') || desc.includes('SUPPLY')) {
      return 'vcc';
    }
    if (name.includes('OUT') || name.includes('Y') || desc.includes('OUTPUT')) {
      return 'output';
    }
    if (name.includes('IN') || name.includes('A') || name.includes('B') || 
        desc.includes('INPUT') || name.match(/^[A-Z]\d*$/)) {
      return 'input';
    }
    
    return 'other';
  };

  const pins = useMemo(() => {
    const arr = [];
    // CHANGED: use verified pinTable (from local DB pipeline) instead of raw report.pinout.table
    const pinTableData = pinTable || [];
    const yOffset = (pinsPerSide - 1) / 2;
    
    const labelX = 2.2;
    const labelYSpacing = pinsPerSide > 6 ? 1.0 : 0.85;
    
    for (let i = 0; i < pinsPerSide; i++) {
      const z = -bodyD / 2 + pinSpacing * (i + 1);
      
      const pinNumLeft = i + 1;
      // CHANGED: match against either `pin` or `number` field (verified pins use `number`)
      const dataLeft = pinTableData.find(p => String(p.pin ?? p.number) === String(pinNumLeft)) || { 
        name: `Pin ${pinNumLeft}`, 
        description: '',
        type: 'other'
      };
      
      const pinNumRight = pinCount - i;
      const dataRight = pinTableData.find(p => String(p.pin ?? p.number) === String(pinNumRight)) || { 
        name: `Pin ${pinNumRight}`, 
        description: '',
        type: 'other'
      };

      arr.push({
        id: `pin-L-${pinNumLeft}`,
        pos: [-bodyW / 2 - pinW / 2, -bodyH / 2 - pinH / 2, z],
        num: pinNumLeft, data: dataLeft, side: 'left',
        labelPos: new THREE.Vector3(-labelX, (yOffset - i) * labelYSpacing, 0),
        ref: React.createRef()
      });

      arr.push({
        id: `pin-R-${pinNumRight}`,
        pos: [bodyW / 2 + pinW / 2, -bodyH / 2 - pinH / 2, z],
        num: pinNumRight, data: dataRight, side: 'right',
        labelPos: new THREE.Vector3(labelX, (yOffset - i) * labelYSpacing, 0),
        ref: React.createRef()
      });
    }
    return arr;
  }, [pinsPerSide, bodyW, bodyD, bodyH, pinSpacing, pinH, pinW, pinCount, pinTable]);

  return (
    <>
      <OrbitControls enableRotate={false} enablePan={false} enableZoom={true} minDistance={3} maxDistance={15} />

      <group>
        {pins.map((pin) => {
          // DYNAMICALLY determine pin type and color
          const pinType = getPinType(pin.data);
          
          const colorClass = pinType === 'vcc' ? 'bg-red-500' : 
                             pinType === 'gnd' ? 'bg-slate-900' : 
                             pinType === 'output' ? 'bg-green-600' :
                             pinType === 'input' ? 'bg-blue-600' :
                             'bg-slate-300';

          const lineColor = pinType === 'vcc' ? '#dc2626' : 
                           pinType === 'gnd' ? '#0f172a' : 
                           pinType === 'output' ? '#16a34a' : 
                           pinType === 'input' ? '#2563eb' : 
                           '#64748b';
          
          const labelMap = {
            'vcc': '+5V / VCC',
            'gnd': 'GROUND',
            'output': 'OUTPUT',
            'input': 'INPUT',
            'other': 'PIN'
          };
          const basicLabel = labelMap[pinType] || 'PIN';

          return (
            <group key={pin.id}>
              {labelMode !== 0 && (
                <>
                  <Html position={pin.labelPos} center zIndexRange={[100, 0]}>
                    {labelMode === 2 ? (
                      <div className={`flex flex-col rounded-lg shadow-lg w-[115px] pointer-events-none select-none overflow-hidden ${colorClass}`}>
                        <div className="flex items-center justify-between px-2 py-1 bg-black/20">
                          <span className="text-[8px] font-bold text-white/90">PIN {pin.num}</span>
                          <span className="text-[8px] font-bold text-white/90 bg-white/20 px-1 py-0.5 rounded">{pin.data.name}</span>
                        </div>
                        <div className="flex items-center justify-center py-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-white text-center">{basicLabel}</span>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-center px-3 py-1.5 rounded-lg shadow-md w-[95px] pointer-events-none select-none ${colorClass}`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white text-center">{basicLabel}</span>
                      </div>
                    )}
                  </Html>
                  <DynamicLine labelPos={pin.labelPos} pinRef={pin.ref} color={lineColor} />
                </>
              )}
            </group>
          );
        })}
      </group>

      <group ref={icGroupRef}>
        <mesh castShadow>
          <boxGeometry args={[bodyW, bodyH, bodyD]} />
          <meshStandardMaterial color="#2A2A2E" roughness={0.4} metalness={0.05} />
        </mesh>

        <mesh position={[0, bodyH / 2 + 0.002, -bodyD / 2]} rotation={[-Math.PI / 2, 0, Math.PI]}>
          <circleGeometry args={[0.08, 32, 0, Math.PI]} />
          <meshStandardMaterial color="#111" />
        </mesh>

        <mesh position={[-bodyW / 2 + 0.15, bodyH / 2 + 0.002, -bodyD / 2 + 0.25]}>
          <circleGeometry args={[0.03, 16]} />
          <meshStandardMaterial color="#888" />
        </mesh>

        <Text position={[0, bodyH / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.08} color="#CCCCCC" anchorX="center" anchorY="middle">
          {icName}
        </Text>

        {pins.map(pin => (
          <mesh key={`mesh-${pin.id}`} position={pin.pos} ref={pin.ref} castShadow>
            <boxGeometry args={[pinW, pinH, pinD]} />
            <meshStandardMaterial color="#B8B8C0" metalness={0.85} roughness={0.15} />
          </mesh>
        ))}
      </group>

      <ContactShadows position={[0, -bodyH / 2 - pinH - 0.5, 0]} opacity={0.3} scale={4} blur={2} />
    </>
  );
}

function Loader3D() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ccc" wireframe />
    </mesh>
  );
}

export default function ICViewer3DTab({ report }) {
  const [labelMode, setLabelMode] = useState(2);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [key, setKey] = useState(0);
  const pinCount = parsePinCount(report?.pinout?.table);

  // NEW: resolve the same verified local-DB pinout that PinTopologyTab uses
  const verifiedPins = useVerifiedPinout(report);

  // Force remount when report changes
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [report]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-primary-600" />
          <span className="section-title !mb-0">3D IC Model — {report.packageType || 'DIP'}</span>
        </div>
        <div className="flex items-center gap-3">
          <RotateCw size={14} className="text-slate-400" />
          <span className="text-[10px] text-slate-400 font-medium">Auto-rotates • Drag to explore</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200 relative shadow-inner mb-6 cursor-grab active:cursor-grabbing" style={{ height: '500px' }}>
        <Canvas 
          key={key}
          camera={{ position: [0, 0, 8], fov: 45 }} 
          shadows
          gl={{ powerPreference: "high-performance", preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <directionalLight position={[-3, 4, -3]} intensity={0.3} />
          <Suspense fallback={<Loader3D />}>
            <ICScene
              pinCount={pinCount}
              icName={report.identification.name}
              pinTable={verifiedPins || report?.pinout?.table || []}
              labelMode={labelMode}
              resetTrigger={resetTrigger}
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="mb-6 p-5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <Settings2 size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Pin Labels Mode</p>
            <p className="text-xs text-slate-500">Toggle text visibility & reset view</p>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full sm:w-auto overflow-x-auto">
          <button onClick={() => setResetTrigger(prev => prev + 1)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent transition-all shrink-0">
            <RefreshCcw size={14} /> Reset
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
          
          <button onClick={() => setLabelMode(1)} className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-md transition-all ${labelMode === 1 ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}>
            Basic
          </button>
          <button onClick={() => setLabelMode(2)} className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-md transition-all ${labelMode === 2 ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}>
            Detailed
          </button>
          <button onClick={() => setLabelMode(0)} className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-md transition-all ${labelMode === 0 ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}>
            Off
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Pins', val: pinCount },
          { label: 'Per Side', val: getPinsPerSide(pinCount) },
          { label: 'Package', val: report.packageType || 'DIP' },
          { label: 'Family', val: report.identification.family },
        ].map(s => (
          <div key={s.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-sm font-black text-slate-800">{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}