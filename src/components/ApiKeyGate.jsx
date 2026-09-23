import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, ArrowRight, ChevronDown, ExternalLink, Loader2, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { getSettings, saveSettings, clearSettings, PROVIDERS } from '../config';
import { testConnection } from '../services/aiProvider';

export default function ApiKeyGate({ onReady }) {
  const [settings, setSettings] = useState(getSettings());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'

  const providerConfig = PROVIDERS[settings.provider];

  const update = (key, val) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      saveSettings(next);
      return next;
    });
    setError('');
    setTestResult(null);
  };

  const handleProviderChange = (provider) => {
    const cfg = PROVIDERS[provider];
    setSettings(prev => {
      const next = { ...prev, provider, model: cfg.defaultModel };
      saveSettings(next);
      return next;
    });
    setError('');
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!settings.apiKey.trim()) { setError('Enter an API key first'); return; }
    if (settings.provider === 'custom' && !settings.customBaseUrl) { setError('Enter the base URL for custom provider'); return; }

    setTesting(true);
    setError('');
    setTestResult(null);
    try {
      // Save current settings before testing
      saveSettings(settings);
      const result = await testConnection();
      setTestResult('ok');
      console.log('[Test] Connection successful:', result);
    } catch (e) {
      setTestResult('fail');
      setError(e.message);
      console.error('[Test] Connection failed:', e.message);
    }
    setTesting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!settings.apiKey.trim()) { setError('Please enter your API key'); return; }
    if (settings.provider === 'custom' && !settings.customBaseUrl) { setError('Please enter the base URL'); return; }

    saveSettings(settings);
    onReady(settings);
  };

  useEffect(() => {
    // Auto-skip if env key exists
    if (import.meta.env.VITE_GEMINI_API_KEY && !getSettings().apiKey) {
      const s = getSettings();
      saveSettings(s);
      onReady(s);
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="card p-6 sm:p-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-5">
            <Key className="w-6 h-6 text-primary-700" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-900 text-center mb-1">Configure AI Provider</h2>
          <p className="text-sm text-slate-500 text-center mb-6">Choose provider, enter key, test it, then start</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider */}
            <div>
              <label className="data-label block mb-1.5">Provider</label>
              <div className="relative">
                <select value={settings.provider} onChange={e => handleProviderChange(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl text-sm font-medium bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all cursor-pointer">
                  {Object.entries(PROVIDERS).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="data-label block mb-1.5">Model</label>
              {settings.provider === 'custom' ? (
                <input type="text" value={settings.customModel} onChange={e => update('customModel', e.target.value)}
                  placeholder="e.g., gpt-4o-mini, deepseek-chat"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
              ) : (
                <div className="relative">
                  <select value={settings.model} onChange={e => update('model', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl text-sm font-medium bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all cursor-pointer">
                    {providerConfig.models.map(m => (<option key={m} value={m}>{m}</option>))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="data-label block mb-1.5">API Key</label>
              <div className="relative">
                <input type="password" value={settings.apiKey} onChange={e => update('apiKey', e.target.value)}
                  placeholder={providerConfig.keyHint}
                  className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>

            {/* Custom Base URL */}
            {settings.provider === 'custom' && (
              <div className="animate-fade-up">
                <label className="data-label block mb-1.5">Base URL</label>
                <input type="text" value={settings.customBaseUrl} onChange={e => update('customBaseUrl', e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
              </div>
            )}

            {/* Test Result */}
            {testResult === 'ok' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl animate-fade-up">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <span className="text-sm text-green-700 font-medium">Connection successful! Ready to scan.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-fade-up">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-600 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button type="button" onClick={handleTest} disabled={testing || !settings.apiKey.trim()}
                className="btn-secondary flex-1 disabled:opacity-50 text-sm">
                {testing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {testing ? 'Testing...' : 'Test Key'}
              </button>
              <button type="submit" className="btn-primary flex-1 text-sm">
                Start Scanning <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Get Key Link */}
          {providerConfig.keyUrl && (
            <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Get your API key:{' '}
                <a href={providerConfig.keyUrl} target="_blank" rel="noopener"
                  className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5">
                  {providerConfig.keyUrl.replace('https://', '')} <ExternalLink size={10} />
                </a>
              </p>
            </div>
          )}

          {/* Advanced */}
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
            <Settings size={12} /> {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 animate-fade-up">
              <p className="text-[11px] font-semibold text-slate-600">Free Tier Limits:</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-600">Gemini Flash</p><p>15 RPM / 1500 RPD</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-600">GLM-4-Flash</p><p>Free tier available</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-600">Qwen-Turbo</p><p>Free tier available</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <p className="font-semibold text-slate-600">Sarvam</p><p>Free tier available</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Tip: Always click "Test Key" before scanning to verify your key works.</p>
              <button onClick={() => { clearSettings(); setSettings(getSettings()); setError(''); setTestResult(null); }}
                className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
                Reset all saved settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}