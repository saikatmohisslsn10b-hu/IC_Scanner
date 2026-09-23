import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { askAboutIC } from '../services/gemini';

export default function ChatPanel({ open, onClose, report }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const answer = await askAboutIC(report.identification.name, q, JSON.stringify(report.identification));
      setMessages(prev => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Failed to get response. Check your connection.' }]);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary-600" />
            <span className="text-sm font-display font-bold text-slate-900">Ask about {report.identification.name}</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
          {messages.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Ask anything about this IC...</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-700 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-700 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <Loader2 size={16} className="animate-spin text-primary-500" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-3 !py-2.5 disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}