import React from 'react';
import { Binary } from 'lucide-react';

export default function TechProfileTab({ data }) {
  if (!data?.length) return <p className="text-sm text-slate-400">No technical data available.</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Binary size={16} className="text-primary-600" />
        <span className="section-title !mb-0">Technical Profile — {data.length} Parameters</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {data.map(item => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 group-hover:border-primary-300 group-hover:text-primary-600 flex items-center justify-center text-[10px] font-bold text-slate-400 transition-all">
                {item.id}
              </span>
              <span className="data-label">{item.label}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 pl-10">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}