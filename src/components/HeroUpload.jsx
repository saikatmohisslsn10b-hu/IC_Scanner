import React, { useRef } from 'react';
import { Upload, Camera, Cpu, ArrowRight, Zap } from 'lucide-react';

export default function HeroUpload({ onFileSelect, onCameraClick, isAnalyzing }) {
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onFileSelect(ev.target.result, file.type);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto py-16 sm:py-24 px-4 text-center">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-100 rounded-full mb-8">
          <Zap size={12} className="text-primary-600" />
          <span className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">AI-Powered Analysis</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-display font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
          Scan Any IC.<br />
          <span className="text-primary-700">Get Full Intelligence.</span>
        </h2>

        <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-12 leading-relaxed">
          Upload a photo of any integrated circuit. Get pin diagrams, specifications, market pricing, breadboard guides, and viva preparation — all in seconds.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up-delay">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isAnalyzing}
          className="btn-primary text-sm px-8 py-4 shadow-lg shadow-primary-700/15 disabled:opacity-50"
        >
          <Upload size={18} />
          Upload IC Image
        </button>
        <button
          onClick={onCameraClick}
          disabled={isAnalyzing}
          className="btn-secondary text-sm px-8 py-4 disabled:opacity-50"
        >
          <Camera size={18} />
          Open Camera
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 animate-fade-up-delay">
        {[
          { label: 'Pin Diagram', val: 'Auto' },
          { label: 'Specs', val: '15 Points' },
          { label: 'Market Price', val: 'India INR' },
          { label: 'Viva Prep', val: '10 MCQs' },
        ].map((item) => (
          <div key={item.label} className="p-4 bg-white rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-display font-bold text-slate-800">{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}