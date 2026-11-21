import React from 'react';

export default function ProjectFooter() {
  return (
    <footer className="no-print mt-16 pt-8 pb-12 border-t border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider px-2.5 py-0.5 bg-primary-50 border border-primary-100 rounded-full">
                Internal Granted Project
              </span>
              <span className="text-xs font-bold text-slate-900">
                IC Navigator
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Project Title: AI-Based Smart IC Scanner for In-Circuit Testing and Identification
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-slate-600">
            <div>
              <span className="data-label block !text-[10px] mb-0.5">Principal Investigator (PI)</span>
              <span className="font-medium text-slate-800">Prof. Subhojit Paul</span>
            </div>
            <div>
              <span className="data-label block !text-[10px] mb-0.5">Co-Principal Investigators (Co-PIs)</span>
              <span className="font-medium text-slate-800">Dr. Buddhadeb Pradhan, Arijit Ganguly</span>
            </div>
            <div>
              <span className="data-label block !text-[10px] mb-0.5">Student Intern Details</span>
              <div className="space-y-0.5">
                <span className="font-medium text-slate-800 block">Saikat Mohis – CSE, UEM Kolkata (2024–2028)</span>
                <span className="font-medium text-slate-800 block">Srinjoy Patra – CSE, UEM Kolkata (2024–2028)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
