import React from 'react';
import { BookOpen, Lightbulb, Globe, Youtube, ExternalLink, FileText, Search, Video } from 'lucide-react';

export default function ResearchTab({ report }) {
  // DYNAMICALLY GET THE IC NAME (This ensures it works for ANY IC)
  const icName = report.identification?.name || 'Integrated Circuit';
  const icNumber = report.identification?.number || icName;
  
  // Build REAL, working search URLs dynamically based on the scanned IC
  const searchTerm = encodeURIComponent(icName);
  
  const realLinks = {
    youtube: [
      { title: `${icName} Tutorial & Explanation`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(icName + ' tutorial electronics')}` },
      { title: `${icName} Pinout & Working`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(icName + ' pinout working')}` },
      { title: `${icName} Practical Circuit`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(icName + ' circuit project')}` },
    ],
    datasheets: [
      { name: 'AllDatasheet', url: `https://www.alldatasheet.com/view.jsp?Searchword=${encodeURIComponent(icNumber)}` },
      { name: 'Datasheet Archive', url: `https://www.datasheetarchive.com/search?q=${encodeURIComponent(icNumber)}` },
      { name: 'Octopart', url: `https://octopart.com/search?q=${encodeURIComponent(icNumber)}` },
      { name: 'DigiKey', url: `https://www.digikey.in/en/products/result?keywords=${encodeURIComponent(icNumber)}` },
    ],
    wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${searchTerm}`,
    google: `https://www.google.com/search?q=${searchTerm}+datasheet+pdf`,
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-primary-600" />
        <span className="section-title !mb-0">Research & Case Study</span>
      </div>

      {/* Case Study */}
      {report.caseStudy && (
        <div className="card p-5 mb-4">
          <h3 className="text-base font-display font-bold text-slate-900 mb-2">{report.caseStudy.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{report.caseStudy.description}</p>
          <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl">
            <p className="data-label mb-1">Outcome</p>
            <p className="text-sm text-primary-800 font-medium">{report.caseStudy.outcome}</p>
          </div>
        </div>
      )}

      {/* Use Cases */}
      {report.useCases?.length > 0 && (
        <div className="mb-4">
          <h4 className="data-label mb-3 flex items-center gap-2"><Lightbulb size={14} className="text-accent-600" /> Use Cases</h4>
          <div className="space-y-2">
            {report.useCases.map((uc, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-accent-50 border border-accent-200 flex items-center justify-center text-[10px] font-bold text-accent-700 shrink-0">{i + 1}</span>
                <p className="text-sm text-slate-700">{uc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {report.applications && (
        <div className="card p-5 mb-4">
          <h4 className="data-label mb-3">Applications</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Consumer', val: report.applications.consumer },
              { label: 'Industrial', val: report.applications.industrial },
              { label: 'Automotive / IoT', val: report.applications.automotiveIot },
              { label: 'Typical Circuits', val: report.applications.typicalCircuits },
            ].map(app => (
              <div key={app.label}>
                <p className="data-label mb-1">{app.label}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{app.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REAL Resources Section */}
      <div className="card p-5 mb-4">
        <h4 className="data-label mb-3 flex items-center gap-2"><Globe size={14} className="text-primary-600" /> Verified Resources & Links</h4>
        
        {/* Quick Search Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <a href={realLinks.wikipedia} target="_blank" rel="noopener"
            className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all">
            <Globe size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Wikipedia</span>
          </a>
          <a href={realLinks.google} target="_blank" rel="noopener"
            className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all">
            <Search size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">Google Search</span>
          </a>
        </div>

        {/* YouTube Search Links */}
        <div className="mb-4">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Youtube size={12} className="text-red-500" /> YouTube Tutorials (Search)
          </h5>
          <div className="space-y-2">
            {realLinks.youtube.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noopener"
                className="flex items-center gap-3 p-3 bg-red-50/30 border border-red-100 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all group">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <Video size={14} className="text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 group-hover:text-red-700 truncate">{v.title}</p>
                  <p className="text-[10px] text-slate-400">Opens YouTube search for this IC</p>
                </div>
                <ExternalLink size={12} className="text-slate-300 shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Datasheet Links */}
        <div>
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText size={12} className="text-primary-500" /> Datasheets & Components
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {realLinks.datasheets.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noopener"
                className="flex items-center gap-2 p-3 bg-primary-50/30 border border-primary-100 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group">
                <Globe size={14} className="text-primary-500 shrink-0" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700 truncate">{d.name}</span>
                <ExternalLink size={10} className="text-slate-300 ml-auto shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-[10px] text-amber-800 font-medium">
            ️ All links above open real search pages. They are generated dynamically from the IC name to ensure they always work.
          </p>
        </div>
      </div>

      {/* AI-Generated Summary */}
      {report.references && (
        <div className="card p-5 mb-4">
          <h4 className="data-label mb-2">AI Research Summary</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{report.references.summary}</p>
          {report.references.datasheetNotes && (
            <p className="text-xs text-slate-400 mt-2 italic">Datasheet notes: {report.references.datasheetNotes}</p>
          )}
        </div>
      )}

      {/* Confidence */}
      {report.confidence && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="data-label">OCR Score</p>
            <p className="text-lg font-display font-bold text-slate-800">{report.confidence.ocrScore}%</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="data-label">ID Score</p>
            <p className="text-lg font-display font-bold text-slate-800">{report.confidence.idScore}%</p>
          </div>
        </div>
      )}
      {report.confidence?.disclaimer && (
        <p className="text-[10px] text-slate-400 mt-2 italic">{report.confidence.disclaimer}</p>
      )}
    </div>
  );
}