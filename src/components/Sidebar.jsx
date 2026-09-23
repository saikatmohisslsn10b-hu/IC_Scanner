import React, { useState, useMemo } from 'react';
import { Microscope, Sliders, Database, ExternalLink, BookOpen, StickyNote, Youtube } from 'lucide-react';

export default function Sidebar({ image, report }) {
  const [filters, setFilters] = useState({ contrast: 100, brightness: 100, grayscale: false, invert: false });
  const [notes, setNotes] = useState(() => localStorage.getItem('ic_notes') || '');

  const filterStyle = useMemo(() => ({
    filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale ? 1 : 0}) ${filters.invert ? 'invert(1)' : ''}`,
  }), [filters]);

  const handleNotesChange = (val) => {
    setNotes(val);
    localStorage.setItem('ic_notes', val);
  };

  return (
    <div className="space-y-4">
      {/* Image */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Microscope size={14} className="text-primary-600" />
          <span className="section-title !mb-0">Scanned Image</span>
        </div>
        <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-3">
          <img src={image} style={filterStyle} className="w-full h-full object-contain" alt="IC" />
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="data-label">Contrast</span>
              <span className="text-[10px] font-mono text-primary-600">{filters.contrast}%</span>
            </div>
            <input type="range" min={50} max={250} value={filters.contrast}
              onChange={e => setFilters(f => ({ ...f, contrast: +e.target.value }))} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="data-label">Brightness</span>
              <span className="text-[10px] font-mono text-primary-600">{filters.brightness}%</span>
            </div>
            <input type="range" min={50} max={200} value={filters.brightness}
              onChange={e => setFilters(f => ({ ...f, brightness: +e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilters(f => ({ ...f, grayscale: !f.grayscale }))}
              className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${filters.grayscale ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-400'}`}>
              Grayscale
            </button>
            <button onClick={() => setFilters(f => ({ ...f, invert: !f.invert }))}
              className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${filters.invert ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-400'}`}>
              Invert
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={14} className="text-primary-600" />
          <span className="section-title !mb-0">Datasheets</span>
        </div>
        <div className="space-y-2">
          {report.resources?.officialDatasets?.map((ds, i) => (
            <a key={i} href={ds.url} target="_blank" rel="noopener"
              className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group text-xs">
              <Database size={12} className="text-primary-500 shrink-0" />
              <span className="text-slate-600 group-hover:text-primary-700 truncate font-medium">{ds.name}</span>
              <ExternalLink size={10} className="text-slate-300 group-hover:text-primary-500 ml-auto shrink-0" />
            </a>
          ))}
          {report.resources?.wikipedia && (
            <a href={report.resources.wikipedia.url} target="_blank" rel="noopener"
              className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-all group text-xs">
              <BookOpen size={12} className="text-slate-400 shrink-0" />
              <span className="text-slate-600 group-hover:text-slate-800 truncate font-medium">Wikipedia</span>
              <ExternalLink size={10} className="text-slate-300 ml-auto shrink-0" />
            </a>
          )}
          {report.resources?.youtubeVideos?.map((v, i) => (
            <a key={i} href={v.url} target="_blank" rel="noopener"
              className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all group text-xs">
              <Youtube size={12} className="text-red-500 shrink-0" />
              <span className="text-slate-600 group-hover:text-red-700 truncate font-medium">{v.title}</span>
              <ExternalLink size={10} className="text-slate-300 ml-auto shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote size={14} className="text-primary-600" />
          <span className="section-title !mb-0">Research Notes</span>
        </div>
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Write your observations..."
          className="w-full h-32 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all custom-scroll"
        />
        <p className="text-[9px] text-slate-300 mt-2 font-medium">Auto-saved locally</p>
      </div>
    </div>
  );
}