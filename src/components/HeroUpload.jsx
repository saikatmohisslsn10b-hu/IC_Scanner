import React, { useRef } from 'react';
import { Upload, Camera, Zap, Key } from 'lucide-react';

export default function HeroUpload({ onFileSelect, onCameraClick, isAnalyzing, onConfigureApi }) {
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

        <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Upload a photo of any integrated circuit. Get pin diagrams, specifications, market pricing, breadboard guides, and viva preparation — all in seconds.
        </p>
      </div>

      {/* API REQUIREMENT NOTICE DIRECTLY ABOVE THE EXISTING IC IMAGE-UPLOAD SECTION */}
      <div className="mb-8 p-5 bg-primary-50/70 border border-primary-100 rounded-2xl text-center max-w-2xl mx-auto animate-fade-up">
        <p className="text-sm font-semibold text-slate-900 leading-snug mb-1.5">
          IC Navigator is a fully API-powered IC identification platform. To use the scanner, you must provide your own API key from a supported AI provider and select a compatible vision model.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          Bring your own API key. Choose your preferred AI provider and compatible model. No fixed AI provider is required.
        </p>
        {onConfigureApi && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onConfigureApi}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-white hover:bg-primary-50 border border-primary-200 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              <Key size={13} /> Configure API Key &amp; Model
            </button>
          </div>
        )}
      </div>

      {/* EXISTING UPLOAD & CAMERA BUTTONS (PRESERVED EXACTLY) */}
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

      {/* QUICK STATS (PRESERVED EXACTLY) */}
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

      {/* PROJECT INFORMATION — LANDING PAGE */}
      <div className="mt-14 text-left card p-6 sm:p-8 animate-fade-up-delay">
        <div className="inline-block px-3 py-1 bg-primary-50 text-primary-700 border border-primary-100 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
          Internal Granted Project
        </div>

        <h3 className="text-lg sm:text-xl font-display font-bold text-slate-900 tracking-tight mb-1">
          Project Title: AI-Based Smart IC Scanner for In-Circuit Testing and Identification
        </h3>
        <p className="text-sm font-semibold text-primary-700 mb-6">
          Project Name: IC Navigator
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <h4 className="data-label mb-2">Principal Investigator (PI)</h4>
            <p className="text-sm font-semibold text-slate-800">Prof. Subhojit Paul</p>

            <h4 className="data-label mt-4 mb-2">Co-Principal Investigators (Co-PIs)</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                <span>Dr. Buddhadeb Pradhan</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
                <span>Arijit Ganguly</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="data-label mb-2">Student Intern Details</h4>
            <ul className="text-sm text-slate-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-800">Saikat Mohis</span>
                  <span className="text-slate-500 text-xs block">CSE, UEM Kolkata (2024–2028)</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-800">Srinjoy Patra</span>
                  <span className="text-slate-500 text-xs block">CSE, UEM Kolkata (2024–2028)</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
