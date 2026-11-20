import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, ArrowRight, ChevronDown, ExternalLink, Loader2, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { getSettings, saveSettings, clearSettings, isApiKeyConfigured, isModelConfigured, PROVIDERS, OPENROUTER_MODEL } from '../config';
import { testConnection } from '../services/aiProvider';

export default function ApiKeyGate({ onReady }) {
  const [settings, setSettings] = useState(getSettings());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'

  const providerConfig = PROVIDERS[settings.provider] || PROVIDERS.openrouter;

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
    const cfg = PROVIDERS[provider] || PROVIDERS.openrouter;
    setSettings(prev => {
      const next = { ...prev, provider, model: cfg.defaultModel || prev.model };
      saveSettings(next);
      return next;
    });
    setError('');
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!isApiKeyConfigured(settings.apiKey)) {
      setError('Please enter your OpenRouter API key first.');
      return;
    }

    setTesting(true);
    setError('');
    setTestResult(null);
    try {
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
    if (!isApiKeyConfigured(settings.apiKey)) {
      setError('OpenRouter API key is not configured. Please enter your API key or configure it in src/config.js.');
      return;
    }
    if (!isModelConfigured(settings.model)) {
      setError('Please configure the model identifier (intended: Gemini 3.1 Flash).');
      return;
    }

    saveSettings(settings);
    onReady(settings);
  };

  useEffect(() => {
    // Auto-skip if API key is already configured locally in src/config.js or .env
    const s = getSettings();
    if (isApiKeyConfigured(s.apiKey)) {
      saveSettings(s);
      onReady(s);
    }
  }, [onReady]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="card p-6 sm:p-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-5">
            <Key className="w-6 h-6 text-primary-700" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-900 text-center mb-1">Configure OpenRouter AI</h2>
          <p className="text-sm text-slate-500 text-center mb-6">Enter OpenRouter API key, configure model, test it, then start</p>

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
              <label className="data-label block mb-1.5">Model Identifier (Intended: Gemini 3.1 Flash)</label>
              <input
                type="text"
                value={settings.model === 'YOUR_OPENROUTER_MODEL_HERE' ? '' : settings.model}
                onChange={e => update('model', e.target.value)}
                placeholder="e.g., google/gemini-2.0-flash-001 or verified OpenRouter model"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">Configurable in <code className="text-primary-600 font-mono">src/config.js</code> or above.</p>
            </div>

            {/* API Key */}
            <div>
              <label className="data-label block mb-1.5">OpenRouter API Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={settings.apiKey === 'YOUR_OPENROUTER_API_KEY_HERE' ? '' : settings.apiKey}
                  onChange={e => update('apiKey', e.target.value)}
                  placeholder={providerConfig?.keyHint || 'sk-or-v1-...'}
                  className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Configurable in <code className="text-primary-600 font-mono">src/config.js</code> or <code className="text-primary-600 font-mono">.env.local</code>.</p>
            </div>

            {/* Test Result */}
            {testResult === 'ok' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl animate-fade-up">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <span className="text-sm text-green-700 font-medium">OpenRouter connection verified! Ready to scan.</span>
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
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !isApiKeyConfigured(settings.apiKey)}
                className="btn-secondary flex-1 disabled:opacity-50 text-sm"
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {testing ? 'Verifying...' : 'Test Key'}
              </button>
              <button type="submit" className="btn-primary flex-1 text-sm">
                Start Scanning <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Get Key Link */}
          {providerConfig?.keyUrl && (
            <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Get your OpenRouter API key:{' '}
                <a href={providerConfig.keyUrl} target="_blank" rel="noopener noreferrer"
                  className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5">
                  openrouter.ai/keys <ExternalLink size={10} />
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
              <p className="text-[11px] font-semibold text-slate-600">Local Usage &amp; CSV Logging:</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Every successful OpenRouter API call records timestamp, prompt, response, input tokens, output tokens, total tokens, and model to <code className="text-slate-700 font-mono">openrouter_usage_log.csv</code> on your local machine.
              </p>
              <div className="p-2 bg-white rounded-lg border border-slate-100 text-[10px] text-slate-500">
                <p className="font-semibold text-slate-700">Intended Model:</p>
                <p>Gemini 3.1 Flash (or any preferred OpenRouter vision model).</p>
              </div>
              <button
                onClick={() => { clearSettings(); setSettings(getSettings()); setError(''); setTestResult(null); }}
                className="text-[10px] text-red-400 hover:text-red-600 transition-colors pt-1 block"
              >
                Reset saved session settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
