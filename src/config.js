// ============================================================================
// IC NAVIGATOR — BRING YOUR OWN API KEY (BYOK) MULTI-PROVIDER CONFIGURATION
// ============================================================================
// Supported Providers:
// 1. OpenAI
// 2. Google Gemini
// 3. Anthropic Claude
// 4. OpenRouter
// 5. Groq
// 6. Together AI
// 7. Fireworks AI
// 8. DeepSeek
// 9. Mistral AI
// 10. Custom OpenAI-compatible endpoints
//
// SECURITY NOTICE:
// Credentials are kept strictly IN MEMORY for the current session only.
// They are NEVER saved to localStorage, sessionStorage, IndexedDB, or cookies.
// ============================================================================

export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    visionModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    keyHint: 'sk-proj-... or sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    requiresKey: true,
    supportsDiscovery: true,
  },
  gemini: {
    name: 'Google Gemini',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    visionModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-pro-exp'],
    keyHint: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    requiresKey: true,
    supportsDiscovery: true,
  },
  anthropic: {
    name: 'Anthropic Claude',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    visionModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    keyHint: 'sk-ant-api03-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    requiresKey: true,
    supportsDiscovery: false,
  },
  openrouter: {
    name: 'OpenRouter',
    type: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-001',
    models: [
      'google/gemini-2.0-flash-001',
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.2-11b-vision-instruct',
    ],
    visionModels: [
      'google/gemini-2.0-flash-001',
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.2-11b-vision-instruct',
    ],
    keyHint: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    requiresKey: true,
    supportsDiscovery: true,
  },
  groq: {
    name: 'Groq',
    type: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.2-11b-vision-preview',
    models: ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'],
    visionModels: ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'],
    keyHint: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    requiresKey: true,
    supportsDiscovery: true,
  },
  together: {
    name: 'Together AI',
    type: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-Vision-Free',
    models: ['meta-llama/Llama-Vision-Free', 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo'],
    visionModels: ['meta-llama/Llama-Vision-Free', 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo'],
    keyHint: 'API Key from Together AI',
    keyUrl: 'https://api.together.xyz/settings/api-keys',
    requiresKey: true,
    supportsDiscovery: true,
  },
  fireworks: {
    name: 'Fireworks AI',
    type: 'openai',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p2-11b-vision-instruct',
    models: ['accounts/fireworks/models/llama-v3p2-11b-vision-instruct'],
    visionModels: ['accounts/fireworks/models/llama-v3p2-11b-vision-instruct'],
    keyHint: 'fw_...',
    keyUrl: 'https://fireworks.ai/account/api-keys',
    requiresKey: true,
    supportsDiscovery: true,
  },
  deepseek: {
    name: 'DeepSeek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    visionModels: [], // DeepSeek models currently do NOT support vision/image input
    keyHint: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    requiresKey: true,
    supportsDiscovery: true,
  },
  mistral: {
    name: 'Mistral AI',
    type: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'pixtral-12b-2409',
    models: ['pixtral-12b-2409', 'pixtral-large-latest'],
    visionModels: ['pixtral-12b-2409', 'pixtral-large-latest'],
    keyHint: 'API Key from Mistral Console',
    keyUrl: 'https://console.mistral.ai/api-keys/',
    requiresKey: true,
    supportsDiscovery: true,
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    type: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: '',
    models: [],
    visionModels: [],
    keyHint: 'Custom API Key (leave blank if not required)',
    keyUrl: '',
    requiresKey: false,
    supportsDiscovery: true,
  },
};

// ============================================================================
// IN-MEMORY SESSION CREDENTIAL STORE
// ============================================================================
// Strictly in-memory: Never saved to localStorage, sessionStorage, IndexedDB, or cookies.
// Cleared on page refresh or explicit reset.
// ============================================================================

const defaultSettings = {
  provider: 'openrouter',
  apiKey: '',
  model: PROVIDERS.openrouter.defaultModel,
  baseUrl: PROVIDERS.openrouter.baseUrl,
};

let inMemorySettings = { ...defaultSettings };

export const isApiKeyConfigured = (key) => {
  return Boolean(
    key &&
    typeof key === 'string' &&
    key.trim() !== '' &&
    !key.trim().startsWith('YOUR_')
  );
};

export const isModelConfigured = (model) => {
  return Boolean(
    model &&
    typeof model === 'string' &&
    model.trim() !== '' &&
    !model.trim().startsWith('YOUR_')
  );
};

/**
 * Checks whether a provider and model combination supports vision/image input.
 * IC identification strictly requires image understanding.
 */
export const checkVisionSupport = (provider, model) => {
  const cfg = PROVIDERS[provider];
  if (!cfg) return { supported: true };

  // Explicit non-vision providers
  if (provider === 'deepseek') {
    return {
      supported: false,
      reason: 'DeepSeek models (deepseek-chat, deepseek-reasoner) currently do not support image/vision input. IC identification requires a vision-capable model (e.g., GPT-4o, Gemini 2.0 Flash, Claude 3.5 Sonnet, Pixtral, or Llama 3.2 Vision).',
    };
  }

  if (!model || typeof model !== 'string') {
    return { supported: false, reason: 'No model specified.' };
  }

  const m = model.toLowerCase();

  // Known vision models in config
  if (cfg.visionModels && cfg.visionModels.some(vm => vm.toLowerCase() === m)) {
    return { supported: true };
  }

  // Common pattern checks for vision capability
  if (
    m.includes('vision') ||
    m.includes('4o') ||
    m.includes('gemini') ||
    m.includes('pixtral') ||
    m.includes('claude-3') ||
    m.includes('vl') ||
    m.includes('llava') ||
    m.includes('qwen-vl')
  ) {
    return { supported: true };
  }

  // OpenAI non-vision check
  if (provider === 'openai' && (m.includes('gpt-3.5') || m.includes('davinci') || (m.startsWith('gpt-4') && !m.includes('4o') && !m.includes('turbo')))) {
    return {
      supported: false,
      reason: `OpenAI model "${model}" does not support image input. Please use a vision model such as gpt-4o or gpt-4o-mini.`,
    };
  }

  // Anthropic non-vision check
  if (provider === 'anthropic' && (m.includes('claude-2') || m.includes('claude-1') || m.includes('instant'))) {
    return {
      supported: false,
      reason: `Anthropic model "${model}" does not support image input. Please use Claude 3 or Claude 3.5 models.`,
    };
  }

  // Groq non-vision check
  if (provider === 'groq' && !m.includes('vision')) {
    return {
      supported: false,
      reason: `Groq model "${model}" does not support image input. Please use llama-3.2-11b-vision-preview or llama-3.2-90b-vision-preview.`,
    };
  }

  // Custom provider advisory
  if (provider === 'custom') {
    return {
      supported: true,
      advisory: 'Ensure your custom endpoint model supports multimodal / vision chat completions.',
    };
  }

  return { supported: true };
};

/**
 * Retrieves the current in-memory settings.
 */
export const getSettings = () => {
  return { ...inMemorySettings };
};

/**
 * Saves settings to in-memory session store only.
 * Intentionally does NOT persist to localStorage/sessionStorage/cookies.
 */
export const saveSettings = (newSettings) => {
  if (!newSettings || typeof newSettings !== 'object') return;
  inMemorySettings = {
    ...inMemorySettings,
    ...newSettings,
  };
};

/**
 * Clears in-memory settings for the current session.
 */
export const clearSettings = () => {
  inMemorySettings = { ...defaultSettings };
};
