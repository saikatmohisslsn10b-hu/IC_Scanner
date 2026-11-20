// ============================================================================
// OPENROUTER CONFIGURATION (USER CONFIGURABLE)
// ============================================================================
// 1. OPENROUTER API KEY:
//    Insert your actual OpenRouter API key below, replacing the placeholder.
//    Alternatively, set the VITE_OPENROUTER_API_KEY environment variable.
export const OPENROUTER_API_KEY = '';

// 2. OPENROUTER MODEL IDENTIFIER:
//    Intended Model: Gemini 3.1 Flash
//    Do not guess or hardcode an unverified identifier. Manually configure your
//    verified OpenRouter model identifier below, or set VITE_OPENROUTER_MODEL.
//    (Example: 'google/gemini-2.0-flash-001' or your intended model on OpenRouter)
export const OPENROUTER_MODEL = 'google/gemini-3.1-flash-lite';

// OpenRouter API base endpoint
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
// ============================================================================

/**
 * Checks if an API key is configured with a real value (not empty or default placeholder).
 */
export const isApiKeyConfigured = (key) => {
  return Boolean(
    key &&
    typeof key === 'string' &&
    key.trim() !== '' &&
    key.trim() !== 'YOUR_OPENROUTER_API_KEY_HERE'
  );
};

/**
 * Checks if a model identifier is configured with a real value (not empty or default placeholder).
 */
export const isModelConfigured = (model) => {
  return Boolean(
    model &&
    typeof model === 'string' &&
    model.trim() !== '' &&
    model.trim() !== 'YOUR_OPENROUTER_MODEL_HERE'
  );
};

/* ── Provider Configuration (OpenRouter Active; Previous Integrations Disabled) ── */
export const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    models: [OPENROUTER_MODEL],
    defaultModel: OPENROUTER_MODEL,
    keyHint: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    baseUrl: OPENROUTER_BASE_URL,
    inputType: 'openrouter',
  },
  /* 
   * Previous local database connections, local models (local_qwen, deepseek),
   * and other third-party servers (gemini direct, glm, sarvam) have been disabled
   * as per project requirements in favor of online OpenRouter API.
   */
};

export const getSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('ic_provider_settings') || '{}');
    const envKey = import.meta.env?.VITE_OPENROUTER_API_KEY;
    const envModel = import.meta.env?.VITE_OPENROUTER_MODEL;

    const apiKey =
      (isApiKeyConfigured(OPENROUTER_API_KEY) ? OPENROUTER_API_KEY : '') ||
      (isApiKeyConfigured(envKey) ? envKey : '') ||
      (isApiKeyConfigured(saved.apiKey) ? saved.apiKey : '');

    const model =
      (isModelConfigured(OPENROUTER_MODEL) ? OPENROUTER_MODEL : '') ||
      (isModelConfigured(envModel) ? envModel : '') ||
      (isModelConfigured(saved.model) ? saved.model : '') ||
      OPENROUTER_MODEL;

    return {
      provider: 'openrouter',
      apiKey,
      model,
      baseUrl: OPENROUTER_BASE_URL,
    };
  } catch {
    return {
      provider: 'openrouter',
      apiKey: isApiKeyConfigured(OPENROUTER_API_KEY) ? OPENROUTER_API_KEY : '',
      model: OPENROUTER_MODEL,
      baseUrl: OPENROUTER_BASE_URL,
    };
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem('ic_provider_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('[Config] Failed to save settings to localStorage:', e);
  }
};

export const clearSettings = () => {
  try {
    localStorage.removeItem('ic_provider_settings');
  } catch (e) {
    console.warn('[Config] Failed to clear settings from localStorage:', e);
  }
};
