/* ── Multi-Provider Configuration ── */
export const PROVIDERS = {
  local_qwen: {
    name: 'Local Qwen-VL (College Server)',
    baseUrl: 'http://192.168.57.148:8001',
    models: ['qwen2.5-vl'],
  },
deepseek: {
    name: 'Local DeepSeek OCR',
    baseUrl: 'http://192.168.57.148:8001', // <-- Hardcoded to your college VPN IP
    models: ['deepseek-ocr'], // <-- This array stops the .map() crash!
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    keyHint: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/apikey',
    inputType: 'gemini', // uses Gemini REST API
  },
  glm: {
    name: 'GLM (ZhipuAI)',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
    defaultModel: 'glm-4-flash',
    keyHint: 'xxxxxxxx.yyyyyyyy',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    inputType: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  },
  sarvam: {
    name: 'Sarvam AI',
    models: ['sarvam-2b', 'sarvam-1'],
    defaultModel: 'sarvam-2b',
    keyHint: 'your-sarvam-key',
    keyUrl: 'https://portal.sarvam.ai/',
    inputType: 'openai',
    baseUrl: 'https://api.sarvam.ai/v1',
  },
  custom: {
    name: 'Custom (OpenAI-Compatible)',
    models: [],
    defaultModel: '',
    keyHint: 'your-api-key',
    keyUrl: '',
    inputType: 'openai',
    baseUrl: '',
  },
};

export const getSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('ic_provider_settings') || '{}');
    return {
      provider: saved.provider || 'gemini',
      apiKey: saved.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '',
      model: saved.model || PROVIDERS.gemini.defaultModel,
      customBaseUrl: saved.customBaseUrl || '',
      customModel: saved.customModel || '',
    };
  } catch {
    return {
      provider: 'gemini',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      model: PROVIDERS.gemini.defaultModel,
      customBaseUrl: '',
      customModel: '',
    };
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem('ic_provider_settings', JSON.stringify(settings));
};

export const clearSettings = () => {
  localStorage.removeItem('ic_provider_settings');
};