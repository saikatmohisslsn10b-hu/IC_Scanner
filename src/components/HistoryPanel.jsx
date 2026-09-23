import React from 'react';
import { X, Clock } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function HistoryPanel({ history, onClose, onSelect, onClear }) {
  return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-primary-600" />
          <h2 className="text-lg font-display font-bold text-slate-900">Scan History</h2>
          <span className="badge bg-slate-100 text-slate-500">{history.length}</span>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && (
            <button onClick={onClear} className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors">
              Clear All
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Clock size={48} className="mb-4 opacity-30" />
            <p className="font-semibold">No scans yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="card-hover p-4 text-left group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 mb-3">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <h4 className="text-sm font-display font-bold text-slate-900 truncate">{item.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{formatDate(item.timestamp)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}