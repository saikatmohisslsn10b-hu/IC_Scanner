import { getSettings, isApiKeyConfigured, isModelConfigured, checkVisionSupport, PROVIDERS } from '../config';
import { logApiUsage } from './csvLogger';

// ── SCHEMA & PROMPT DEFINITION (PRESERVED EXACTLY) ──
const SCHEMA_HINT = `You MUST respond with valid JSON matching this exact structure. Do not include markdown formatting, backticks, or conversational text. Return ONLY this raw JSON object:
{
  "identification": { "name": "string", "number": "string", "manufacturer": "string", "family": "string", "confidence": 85 },
  "technicalProfile": [{ "id": 1, "label": "string", "value": "string" }],
  "pinout": {
    "diagram": "string",
    "table": [{ "pin": "1", "name": "VCC", "description": "Power supply", "type": "power" }],
    "warnings": ["string"]
  },
  "testing": {
    "multimeter": ["string"], "oscilloscope": ["string"],
    "expectedVoltages": "string", "faultSymptoms": ["string"], "safety": ["string"]
  },
  "marketPrice": {
    "indiaRetailers": [{ "store": "string", "price": "₹XX", "availability": "string", "url": "string" }],
    "minPrice": "₹XX", "maxPrice": "₹XX", "bulkTrend": "string"
  },
  "resources": {
    "wikipedia": { "platform": "Wikipedia", "title": "string", "url": "string" },
    "youtubeVideos": [ { "platform": "YouTube", "title": "string", "url": "string" } ],
    "officialDatasets": [{ "name": "Datasheet PDF", "url": "string" }]
  },
  "caseStudy": { "title": "string", "description": "string", "outcome": "string" },
  "useCases": ["string"],
  "references": {
    "summary": "string", "youtubeKeywords": ["string"],
    "datasheetNotes": "string",
    "datasetLinks": [{ "name": "string", "url": "string" }]
  },
  "applications": { "consumer": "string", "industrial": "string", "automotiveIot": "string", "typicalCircuits": "string" },
  "confidence": { "ocrScore": 90, "idScore": 85, "disclaimer": "string" },
  "breadboardGuide": ["string", "string"],
  "crossReferences": [{ "name": "string", "manufacturer": "string", "compatibility": "string", "notes": "string" }],
  "logicInfo": { 
    "isDigital": true, 
    "icCategory": "string",
    "humanReadableLogicType": "string",
    "schematicSvg": "string",
    "truthTable": [{ "inputs": [0,0], "outputs": [0] }] 
  },
  "packageType": "DIP-14"
}`;

const SCAN_PROMPT = `You are an expert Integrated Circuit (IC) identification and analysis engine. Analyze this image of an IC chip.

CRITICAL INSTRUCTIONS (MUST FOLLOW STRICTLY):
1. IDENTIFICATION: Distinguish primary part numbers (e.g., SN74LS04N, M74HC238B1) from lot/date codes. 
2. OBSCURED TEXT HANDLING (CRITICAL): If the IC name is partially erased or covered by ink (e.g., seeing only "SN74L"), you MUST act as a detective and deduce the most likely REAL, widely-used standard IC that fits the visible prefix and package (e.g., guess SN74LS00N, SN74LS04N, or SN74LS08N). 
   - NEVER output a partial, fake, or generic name like "SN74L". 
   - You MUST provide the full, factual datasheet profile, correct pinout, and truth table for the REAL IC you guessed.
   - In the "confidence.disclaimer" JSON field, you must state: "Text was partially obscured; assumed [Guessed IC Name] based on visible characters."
3. ACCURACY: Do not guess logic families unless using the deduction method above.
4. PINOUT: Provide the EXACT correct pinout from the official manufacturer datasheet.
5. YOUTUBE LINKS: DO NOT make up fake video IDs. Generate a valid search URL in this exact format: https://www.youtube.com/results?search_query=[IC_NAME]+tutorial

TASKS:
1. OCR: Extract or deduce the main IC number.
2. Identify IC model and factual function.
3. Provide pin configuration.
4. 15 key technical specs.
5. Testing procedures.
6. Indian market prices (Robu, Mouser, etc.).
7. 1 Wikipedia, 2 YouTube, 3 datasheets.
8. Case study.
9. 5 use cases.
10. Breadboard guide.
11. Cross-reference alternatives.
12. Truth table (if digital).
13. Package type.

${SCHEMA_HINT}`;

// ── UTILITIES (PRESERVED EXACTLY) ──
async function compressImage(base64Str, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image compression failed.'));
    img.src = base64Str;
  });
}

export function extractJSON(text) {
  if (!text) throw new Error('The AI returned an empty response.');
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  console.error('[AI] Raw response that failed JSON parse:', text.substring(0, 500));
  throw new Error('The AI response could not be parsed as JSON. Try scanning again.');
}

// ── ADAPTER: OPENAI & COMPATIBLE PROVIDERS ──
async function callOpenAICompatible({
  provider,
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 0.1,
  maxTokens = 4000,
  responseFormat,
}) {
  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    headers['X-Title'] = 'IC Navigator';
  }

  const body = {
    model: model.trim(),
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  let res;
  let rawText = '';
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    rawText = await res.text();
  } catch (netErr) {
    throw new Error(`${PROVIDERS[provider]?.name || provider} Network Error: ${netErr.message}`);
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(rawText);
      errMsg = errJson?.error?.message || errJson?.detail || errJson?.message || errMsg;
    } catch {}
    if (res.status === 401) {
      throw new Error(`${PROVIDERS[provider]?.name || provider} Authentication Failed (401): Invalid or unauthorized API key.`);
    }
    throw new Error(`${PROVIDERS[provider]?.name || provider} API Error (${res.status}): ${errMsg}`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`${PROVIDERS[provider]?.name || provider} returned an unparseable response.`);
  }

  const outputText = data.choices?.[0]?.message?.content || '';

  // Non-blocking usage logging
  logApiUsage({
    usage: data.usage,
    timestamp: new Date(),
  }).catch(() => {});

  return outputText;
}

// ── ADAPTER: GOOGLE GEMINI ──
async function callGemini({
  baseUrl,
  apiKey,
  model,
  prompt,
  base64Image,
  mimeType = 'image/jpeg',
  temperature = 0.1,
  maxTokens = 4000,
  jsonMode = false,
}) {
  const cleanModel = model.replace(/^models\//, '').trim();
  const endpoint = `${(baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')}/models/${cleanModel}:generateContent?key=${apiKey.trim()}`;

  const parts = [];
  if (prompt) {
    parts.push({ text: prompt });
  }

  if (base64Image) {
    const rawData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    parts.push({
      inlineData: {
        mimeType,
        data: rawData,
      },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  let res;
  let rawText = '';
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    rawText = await res.text();
  } catch (netErr) {
    throw new Error(`Google Gemini Network Error: ${netErr.message}`);
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(rawText);
      errMsg = errJson?.error?.message || errMsg;
    } catch {}
    if (res.status === 400 && errMsg.toLowerCase().includes('api_key_invalid')) {
      throw new Error('Google Gemini Authentication Failed: Invalid API key.');
    }
    throw new Error(`Google Gemini API Error (${res.status}): ${errMsg}`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Google Gemini returned an unparseable response.');
  }

  const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Format token usage metadata from Gemini
  if (data.usageMetadata) {
    logApiUsage({
      usage: {
        prompt_tokens: data.usageMetadata.promptTokenCount,
        completion_tokens: data.usageMetadata.candidatesTokenCount,
        total_tokens: data.usageMetadata.totalTokenCount,
      },
      timestamp: new Date(),
    }).catch(() => {});
  }

  return outputText;
}

// ── ADAPTER: ANTHROPIC CLAUDE ──
async function callAnthropic({
  baseUrl,
  apiKey,
  model,
  prompt,
  base64Image,
  mimeType = 'image/jpeg',
  temperature = 0.1,
  maxTokens = 4000,
}) {
  const endpoint = `${(baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`;

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey.trim(),
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  const content = [];

  if (base64Image) {
    const rawData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: rawData,
      },
    });
  }

  if (prompt) {
    content.push({ type: 'text', text: prompt });
  }

  const body = {
    model: model.trim(),
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content }],
  };

  let res;
  let rawText = '';
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    rawText = await res.text();
  } catch (netErr) {
    throw new Error(`Anthropic Claude Network Error: ${netErr.message}`);
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(rawText);
      errMsg = errJson?.error?.message || errMsg;
    } catch {}
    if (res.status === 401) {
      throw new Error('Anthropic Authentication Failed (401): Invalid API key.');
    }
    throw new Error(`Anthropic Claude API Error (${res.status}): ${errMsg}`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Anthropic Claude returned an unparseable response.');
  }

  const outputText = data.content?.find(c => c.type === 'text')?.text || data.content?.[0]?.text || '';

  // Usage metadata
  if (data.usage) {
    logApiUsage({
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
      },
      timestamp: new Date(),
    }).catch(() => {});
  }

  return outputText;
}

// ── GENERAL MULTI-PROVIDER DISPATCHER ──
async function callConfiguredProvider({
  prompt,
  base64Image,
  mimeType = 'image/jpeg',
  messages,
  responseFormat,
  temperature = 0.1,
  maxTokens = 4000,
  jsonMode = false,
  overrideSettings = null,
}) {
  const s = overrideSettings || getSettings();
  const provider = s.provider || 'openrouter';
  const providerConfig = PROVIDERS[provider] || PROVIDERS.custom;

  // Validate API key if required
  if (providerConfig.requiresKey && !isApiKeyConfigured(s.apiKey)) {
    throw new Error(
      `No API key configured for ${providerConfig.name}. Please open Provider Settings and enter your API key.`
    );
  }

  // Validate Model
  if (!isModelConfigured(s.model)) {
    throw new Error(
      `No model configured for ${providerConfig.name}. Please select or enter a valid model identifier.`
    );
  }

  // Vision Capability Verification
  if (base64Image) {
    const visionCheck = checkVisionSupport(provider, s.model);
    if (!visionCheck.supported) {
      throw new Error(
        `Vision Incompatible: ${visionCheck.reason || 'The configured model does not support image/vision input for IC identification.'}`
      );
    }
  }

  const pType = providerConfig.type;

  if (pType === 'gemini') {
    return callGemini({
      baseUrl: s.baseUrl || providerConfig.baseUrl,
      apiKey: s.apiKey,
      model: s.model,
      prompt,
      base64Image,
      mimeType,
      temperature,
      maxTokens,
      jsonMode: jsonMode || Boolean(responseFormat),
    });
  }

  if (pType === 'anthropic') {
    return callAnthropic({
      baseUrl: s.baseUrl || providerConfig.baseUrl,
      apiKey: s.apiKey,
      model: s.model,
      prompt,
      base64Image,
      mimeType,
      temperature,
      maxTokens,
    });
  }

  // Default: OpenAI-compatible
  const rawData = base64Image
    ? (base64Image.includes(',') ? base64Image.split(',')[1] : base64Image)
    : null;

  let finalMessages = messages;
  if (!finalMessages) {
    if (base64Image) {
      finalMessages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${rawData}` } },
          ],
        },
      ];
    } else {
      finalMessages = [{ role: 'user', content: prompt }];
    }
  }

  return callOpenAICompatible({
    provider,
    baseUrl: s.baseUrl || providerConfig.baseUrl,
    apiKey: s.apiKey,
    model: s.model,
    messages: finalMessages,
    temperature,
    maxTokens,
    responseFormat: responseFormat || (jsonMode ? { type: 'json_object' } : undefined),
  });
}

// ── EXPORTED SCANNER METHODS ──

export const analyzeIC = async (base64Image, mimeType = 'image/jpeg') => {
  let processedImage = base64Image;
  try {
    processedImage = await compressImage(base64Image, 800, 0.7);
    mimeType = 'image/jpeg';
  } catch (err) {
    console.warn('Failed to compress image, using original', err);
  }

  const rawText = await callConfiguredProvider({
    prompt: SCAN_PROMPT,
    base64Image: processedImage,
    mimeType,
    jsonMode: true,
    responseFormat: { type: 'json_object' },
    temperature: 0.1,
    maxTokens: 4000,
  });

  return extractJSON(rawText);
};

export const askAboutIC = async (icName, question, icData) => {
  const prompt = `System Instruction: You are an electronics expert. You have access to technical data for a scanned IC: ${icData}. 
The user is asking a question about a specific IC. 
1. If the question is about the scanned IC (${icName}), use the provided data.
2. If the user asks about a DIFFERENT IC (like 4001), answer based on your general knowledge.
3. Keep answers direct and concise.
User Question: ${question}`;

  return callConfiguredProvider({
    prompt,
    temperature: 0.5,
    maxTokens: 2000,
  });
};

export const generateVivaQuestions = async (icName, icData) => {
  const randomSeed = Math.floor(Math.random() * 1000000);
  const timestamp = Date.now();
  const prompt = `You are a strict electronics lab viva examiner. Generate exactly 10 MCQ questions about this IC: ${icName}.

IC Data: ${icData}

CRITICAL INSTRUCTIONS FOR VARIETY:
- Use random seed: ${randomSeed}
- Timestamp: ${timestamp}
- Each question must have exactly 4 options with one correct answer.

Respond with ONLY valid JSON (no markdown):
{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0}]}`;

  const rawText = await callConfiguredProvider({
    prompt,
    jsonMode: true,
    responseFormat: { type: 'json_object' },
    temperature: 0.4,
    maxTokens: 4000,
  });

  return extractJSON(rawText);
};

/**
 * Tests connection to the selected AI provider.
 * Can be called with explicitly provided settings or uses current in-memory settings.
 */
export const testConnection = async (customSettings = null) => {
  const s = customSettings || getSettings();
  const provider = s.provider || 'openrouter';
  const providerConfig = PROVIDERS[provider] || PROVIDERS.custom;

  if (providerConfig.requiresKey && !isApiKeyConfigured(s.apiKey)) {
    throw new Error(`Please enter an API key for ${providerConfig.name} to test connection.`);
  }

  const model = s.model || providerConfig.defaultModel;
  const baseUrl = s.baseUrl || providerConfig.baseUrl;

  // Check vision compatibility as part of testing
  const visionStatus = checkVisionSupport(provider, model);

  try {
    if (provider === 'gemini') {
      const endpoint = `${baseUrl.replace(/\/$/, '')}/models?key=${s.apiKey.trim()}`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        const txt = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
        throw new Error(`Gemini verification error: ${msg}`);
      }
    } else if (provider === 'anthropic') {
      const endpoint = `${baseUrl.replace(/\/$/, '')}/messages`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model.trim(),
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
        throw new Error(`Anthropic verification error: ${msg}`);
      }
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${s.apiKey.trim()}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
        throw new Error(`OpenRouter verification error: ${msg}`);
      }
    } else {
      // General OpenAI-compatible: try GET /models first
      const endpoint = `${baseUrl.replace(/\/$/, '')}/models`;
      const headers = { 'Content-Type': 'application/json' };
      if (s.apiKey && s.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${s.apiKey.trim()}`;
      }
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        // If /models isn't supported or returned an error, test with a 1-token completion
        const compEndpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const compRes = await fetch(compEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model.trim(),
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
        });
        if (!compRes.ok) {
          const txt = await compRes.text();
          let msg = `HTTP ${compRes.status}`;
          try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
          throw new Error(`${providerConfig.name} connection error: ${msg}`);
        }
      }
    }

    return {
      ok: true,
      provider: providerConfig.name,
      model,
      visionSupported: visionStatus.supported,
      visionWarning: visionStatus.reason || visionStatus.advisory || null,
    };
  } catch (err) {
    throw new Error(err.message || `Failed to connect to ${providerConfig.name}.`);
  }
};

/**
 * Automatically discovers available models from the provider endpoint.
 */
export const fetchAvailableModels = async (provider, apiKey, baseUrl) => {
  const cfg = PROVIDERS[provider];
  if (!cfg) return null;

  try {
    if (provider === 'gemini') {
      if (!apiKey) return null;
      const url = `${(baseUrl || cfg.baseUrl).replace(/\/$/, '')}/models?key=${apiKey.trim()}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.models || [])
        .map(m => m.name.replace(/^models\//, ''))
        .filter(name => !name.includes('embedding') && !name.includes('aqa'));
    }

    if (provider === 'anthropic') {
      // Anthropic does not provide an open CORS models endpoint for client-side listing
      return cfg.models;
    }

    // OpenAI-compatible /models endpoint
    const url = `${(baseUrl || cfg.baseUrl).replace(/\/$/, '')}/models`;
    const headers = {};
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    return list.map(m => m.id || m.name).filter(Boolean);
  } catch {
    return null;
  }
};
