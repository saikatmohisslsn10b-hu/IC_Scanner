import React from 'react';
import { Cpu, History, Maximize2, Minimize2, Settings } from 'lucide-react';
import { PROVIDERS } from '../config';

export default function Navbar({ onHistory, onFullscreen, isFullscreen, provider, onResetProvider }) {
  const providerName = PROVIDERS[provider]?.name || provider || 'Gemini';

  return (
    // Changed bg-white/80 to bg-white and removed backdrop-blur-xl for a solid background
    <nav className="no-print sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary-700 flex items-center justify-center shadow-md">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-display font-bold text-slate-900 tracking-tight">
              IC Navigator
            </h1>
          </div>
        </div>

        {/* CENTER SECTION - LOGOS */}
        <div className="hidden lg:flex items-center justify-center gap-8 flex-shrink-0">
          <img 
            src="/IEM LOGO.jpeg" 
            alt="IEM Logo" 
            className="h-12 w-auto object-contain" 
          />
          <img 
            src="/DEPT CSE DATA SCIENCE LOGO.jpeg" 
            alt="CSE Data Science Logo" 
            className="h-12 w-auto object-contain rounded-full" 
          />
          <img 
            src="/IEDC-WHITE.png" 
            alt="IEDC Logo" 
            className="h-12 w-auto object-contain" 
          />
          <img 
            src="/UEM LOGO (1).jpeg" 
            alt="UEM Logo" 
            className="h-12 w-auto object-contain" 
          />
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center justify-end gap-3 flex-1 overflow-hidden">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full border border-primary-100 flex-shrink-0">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
            </span>
            <span 
              className="text-xs font-bold text-primary-700 uppercase tracking-wider truncate max-w-[120px] xl:max-w-[200px]" 
              title={providerName}
            >
              {providerName}
            </span>
          </div>

          <button onClick={onHistory} className="flex items-center gap-2 text-slate-600 hover:text-primary-700 transition-colors text-sm font-semibold px-3 py-2 rounded-lg hover:bg-primary-50 flex-shrink-0">
            <History size={18} /><span className="hidden sm:inline">History</span>
          </button>

          <button onClick={onResetProvider}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold px-3 py-2 rounded-lg hover:bg-slate-100 flex-shrink-0"
            title="Change AI Provider / API Key">
            <Settings size={18} /><span className="hidden sm:inline">Provider</span>
          </button>

          <button onClick={onFullscreen} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
        
      </div>
    </nav>
  );
}