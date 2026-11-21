import React, { useState, useEffect } from 'react';
import {
  Key, ShieldCheck, ArrowRight, ChevronDown, ExternalLink,
  Loader2, CheckCircle2, XCircle, Settings, Eye, EyeOff,
  RefreshCw, AlertTriangle, X, Info
} from 'lucide-react';
import {
  getSettings, saveSettings, clearSettings,
  isApiKeyConfigured, isModelConfigured, checkVisionSupport,
  PROVIDERS
} from '../config';
import { testConnection, fetchAvailableModels } from '../services/aiProvider';

export default function ApiKeyGate({ onReady, onClose, isModal = false }) {
  const current = getSettings();
  const [provider, setProvider] = useState(current.provider || 'openrouter');
  const [baseUrl, setBaseUrl] = useState(current.baseUrl || PROVIDERS.openrouter.baseUrl);
  const [model, setModel] = useState(current.model || PROVIDERS.openrouter.defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [savedKeyExists, setSavedKeyExists] = useState(() => isApiKeyConfigured(current.apiKey));
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { ok: boolean, message: string, warning?: string }
  const [discovering, setDiscovering] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState(null);

  const providerConfig = PROVIDERS[provider] || PROVIDERS.custom;
  const visionCheck = checkVisionSupport(provider, model);

  // When provider changes, auto-populate base URL and default model
  const handleProviderChange = (newProvider) => {
    const cfg = PROVIDERS[newProvider] || PROVIDERS.custom;
    setProvider(newProvider);
    setBaseUrl(cfg.baseUrl || '');
    setModel(cfg.defaultModel || '');
    setDiscoveredModels(null);
    setError('');
    setTestResult(null);
  };

  const handleDiscoverModels = async () => {
    const keyToUse = apiKey || (savedKeyExists ? current.apiKey : '');
    setDiscovering(true);
    setError('');
    try {
      const models = await fetchAvailableModels(provider, keyToUse, baseUrl);
      if (models && models.length > 0) {
        setDiscoveredModels(models);
      } else {
        setError(`No models returned by ${providerConfig.name} or endpoint does not support client listing.`);
      }
    } catch (e) {
      setError(`Model discovery failed: ${e.message}`);
    }
    setDiscovering(false);
  };

  const handleTest = async () => {
    const keyToUse = apiKey.trim() || (savedKeyExists ? current.apiKey : '');
    if (providerConfig.requiresKey && !isApiKeyConfigured(keyToUse)) {
      setError(`Please enter your ${providerConfig.name} API key first.`);
      return;
    }

    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      const result = await testConnection({
        provider,
        apiKey: keyToUse,
        model: model.trim(),
        baseUrl: baseUrl.trim(),
      });
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
      setError(e.message);
    }
    setTesting(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const keyToUse = apiKey.trim() || (savedKeyExists ? current.apiKey : '');

    if (providerConfig.requiresKey && !isApiKeyConfigured(keyToUse)) {
      setError(`Please enter a valid API key for ${providerConfig.name}.`);
      return;
    }

    if (!isModelConfigured(model)) {
      setError('Please select or specify a model identifier.');
      return;
    }

    const newSettings = {
      provider,
      apiKey: keyToUse,
      model: model.trim(),
      baseUrl: baseUrl.trim() || providerConfig.baseUrl,
    };

    saveSettings(newSettings);
    onReady(newSettings);
  };

  const handleClearSession = () => {
    clearSettings();
    setApiKey('');
    setSavedKeyExists(false);
    setProvider('openrouter');
    setBaseUrl(PROVIDERS.openrouter.baseUrl);
    setModel(PROVIDERS.openrouter.defaultModel);
    setTestResult(null);
    setError('');
  };

  return (
    <div className={`${isModal ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto' : 'min-h-screen bg-bg flex items-center justify-center p-4'}`}>
      <div className="w-full max-w-xl animate-fade-up my-auto">
        <div className="card p-6 sm:p-8 relative shadow-xl">
          {/* Close button if modal */}
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          )}

          <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-4">
            <Key className="w-6 h-6 text-primary-700" />
          </div>
          
          <h2 className="text-xl font-display font-bold text-slate-900 text-center mb-1">
            API Configuration (BYOK)
          </h2>
          <p className="text-xs text-slate-500 text-center mb-6 max-w-md mx-auto">
            Bring Your Own Key: Choose your preferred AI provider, configure a vision-compatible model, and test connection.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. PROVIDER SELECTION */}
            <div>
              <label className="data-label block mb-1.5">AI Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={e => handleProviderChange(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl text-sm font-medium bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all cursor-pointer"
                >
                  {Object.entries(PROVIDERS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.name} {cfg.visionModels?.length === 0 ? '(Text Only)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. BASE URL */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="data-label">API Base URL</label>
                <span className="text-[10px] text-slate-400">Endpoint</span>
              </div>
              <input
                type="text"
                value={baseUrl}
                onChange={e => { setBaseUrl(e.target.value); setError(''); setTestResult(null); }}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            {/* 3. MODEL IDENTIFIER & DISCOVERY */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="data-label">Model Identifier</label>
                {providerConfig.supportsDiscovery && (
                  <button
                    type="button"
                    onClick={handleDiscoverModels}
                    disabled={discovering}
                    className="text-[11px] font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={11} className={discovering ? 'animate-spin' : ''} />
                    {discovering ? 'Fetching...' : 'Discover Models'}
                  </button>
                )}
              </div>

              {/* Recommended Quick Selection */}
              {providerConfig.models && providerConfig.models.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {providerConfig.models.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setModel(m); setError(''); setTestResult(null); }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all ${
                        model === m
                          ? 'bg-primary-50 border-primary-300 text-primary-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {/* Discovered Models Dropdown if loaded */}
              {discoveredModels && discoveredModels.length > 0 && (
                <div className="mb-2">
                  <select
                    onChange={e => { if (e.target.value) { setModel(e.target.value); setError(''); setTestResult(null); } }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-700"
                    defaultValue=""
                  >
                    <option value="" disabled>Select from {discoveredModels.length} discovered models...</option>
                    {discoveredModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <input
                type="text"
                value={model}
                onChange={e => { setModel(e.target.value); setError(''); setTestResult(null); }}
                placeholder="Enter model identifier (e.g. gpt-4o, gemini-2.0-flash)"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />

              {/* Vision compatibility alert */}
              {!visionCheck.supported && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold">Vision Incompatible:</span> {visionCheck.reason}
                  </div>
                </div>
              )}
            </div>

            {/* 4. API KEY INPUT */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="data-label">
                  {providerConfig.name} API Key {providerConfig.requiresKey ? '' : '(Optional)'}
                </label>
                {savedKeyExists && !apiKey && (
                  <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Saved in Session Memory
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setError(''); setTestResult(null); }}
                  placeholder={
                    savedKeyExists && !apiKey
                      ? '•••••••••••••••• (Leave blank to keep current key)'
                      : providerConfig.keyHint || 'Enter your API key'
                  }
                  className="w-full px-4 py-2.5 pr-20 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                    title={showKey ? 'Hide Key' : 'Show Key'}
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  {savedKeyExists && !apiKey && (
                    <button
                      type="button"
                      onClick={() => { setApiKey(' '); setSavedKeyExists(false); }}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-semibold px-1"
                      title="Replace current key"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {providerConfig.keyUrl && (
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  Get key:{' '}
                  <a
                    href={providerConfig.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    {providerConfig.name} Portal <ExternalLink size={10} />
                  </a>
                </p>
              )}
            </div>

            {/* Test Connection Output */}
            {testResult?.ok && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl space-y-1 animate-fade-up">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-800 font-semibold">
                    {testResult.provider} connection successful!
                  </span>
                </div>
                {testResult.visionWarning && (
                  <p className="text-[11px] text-amber-700 pl-6 leading-relaxed">
                    Note: {testResult.visionWarning}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-fade-up">
                <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-600 leading-relaxed flex-1">{error}</span>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || (providerConfig.requiresKey && !apiKey && !savedKeyExists)}
                className="btn-secondary flex-1 disabled:opacity-50 text-xs py-2.5"
              >
                {testing ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              
              <button
                type="submit"
                className="btn-primary flex-1 text-xs py-2.5"
              >
                Apply Configuration <ArrowRight size={15} />
              </button>
            </div>
          </form>

          {/* SECURITY & SESSION NOTICE */}
          <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Info size={13} className="text-primary-600" />
              <span>In-Memory Security Protocol</span>
            </div>
            <p className="leading-relaxed">
              Credentials are held strictly in browser memory for the active session. They are never written to disk, localStorage, or cookies. Direct browser-based API calls are used.
            </p>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <Settings size={10} /> {showAdvanced ? 'Hide advanced' : 'Advanced details'}
              </button>
              <button
                type="button"
                onClick={handleClearSession}
                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
              >
                Reset Session Credentials
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 space-y-2 animate-fade-up">
              <p className="font-semibold text-slate-700">Token-Only Usage Logging:</p>
              <p>
                API requests record 4-column token counts (Timestamp, Input_Tokens, Output_Tokens, Total_Tokens) for usage monitoring.
              </p>
              <p className="font-semibold text-slate-700">Vision Requirement:</p>
              <p>
                IC image analysis requires an AI model that natively supports image understanding. Text-only models will reject IC image uploads.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
