import { getSettings, PROVIDERS } from '../config';

// ── SCHEMA & PROMPT DEFINITION ──
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
// ── UTILITIES ──
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

function extractJSON(text) {
  if (!text) throw new Error('The AI returned an empty response.');
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  console.error('[AI] Raw response that failed JSON parse:', text.substring(0, 500));
  throw new Error('The AI response could not be parsed as JSON. Try scanning again.');
}

// ── LOCAL QWEN (FASTAPI) PROVIDER ──
async function callLocalVision(baseUrl, base64Image) {
  const url = `${baseUrl.replace(/\/$/, '')}/ocr`;
  try {
    const fetchResponse = await fetch(base64Image);
    const blob = await fetchResponse.blob();
    const formData = new FormData();
    formData.append('image', blob, 'ic_scan.jpg');
    formData.append('prompt', SCAN_PROMPT); 

    const res = await fetch(url, { method: 'POST', body: formData });
    const rawText = await res.text();
    
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const errJson = JSON.parse(rawText); errMsg = errJson?.detail || errMsg; } catch {}
      throw new Error(`Local AI error (${res.status}): ${errMsg}`);
    }
    const data = JSON.parse(rawText);
    return extractJSON(data.text);
  } catch (err) {
    console.error('[Local AI] Error:', err);
    throw new Error(`Local AI Connection Error: ${err.message}`);
  }
}

async function callLocalChat(baseUrl, prompt, maxTokens = 1500) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_tokens: maxTokens }),
    });
    const rawText = await res.text();
    if (!res.ok) throw new Error(`Local AI Chat error (${res.status})`);
    const data = JSON.parse(rawText);
    return data.text;
  } catch (err) {
    console.error('[Local AI Chat] Error:', err);
    throw new Error(`Local AI Connection Error: ${err.message}`);
  }
}

// ── GEMINI (REST API) PROVIDER ──
async function callGemini(apiKey, model, base64Image, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const body = {
    contents: [{ parts: [ { inlineData: { mimeType, data: imageData } }, { text: SCAN_PROMPT } ] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const rawText = await res.text();
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const errJson = JSON.parse(rawText); errMsg = errJson?.error?.message || errMsg; } catch {}
    throw new Error(`Gemini API error (${res.status}): ${errMsg}`);
  }
  const data = JSON.parse(rawText);
  return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function callGeminiChat(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`Gemini chat error (${res.status})`);
  const data = JSON.parse(rawText);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

async function callGeminiViva(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
    }),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`Gemini viva error (${res.status})`);
  const data = JSON.parse(rawText);
  return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
}

// ── OPENAI-COMPATIBLE PROVIDERS ──
function getBaseUrl(provider) {
  const settings = getSettings();
  if (provider === 'custom') return settings.customBaseUrl || '';
  return PROVIDERS[provider]?.baseUrl || '';
}

function buildImagePart(base64Image, mimeType) {
  const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } };
}

async function callOpenAICompatible(provider, apiKey, targetModel, base64Image, mimeType) {
  const baseUrl = getBaseUrl(provider);
  if (!baseUrl) throw new Error(`No base URL for "${provider}". Check provider settings.`);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: 'user', content: [ { type: 'text', text: SCAN_PROMPT }, buildImagePart(base64Image, mimeType) ] }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    }),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`${PROVIDERS[provider]?.name || provider} error (${res.status})`);
  const data = JSON.parse(rawText);
  return extractJSON(data.choices?.[0]?.message?.content);
}

async function callOpenAIChat(provider, apiKey, model, prompt) {
  const baseUrl = getBaseUrl(provider);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 2000 }),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`Chat error (${res.status})`);
  const data = JSON.parse(rawText);
  return data.choices?.[0]?.message?.content || 'No response.';
}

async function callOpenAIViva(provider, apiKey, model, prompt) {
  const baseUrl = getBaseUrl(provider);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 4000 }),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`Viva error (${res.status})`);
  const data = JSON.parse(rawText);
  return extractJSON(data.choices?.[0]?.message?.content || '{}');
}

// ── UNIFIED ROUTER EXPORTS ──
export const analyzeIC = async (base64Image, mimeType = 'image/jpeg') => {
  const s = getSettings();
  let processedImage = base64Image;
  try {
    processedImage = await compressImage(base64Image, 800, 0.7);
    mimeType = 'image/jpeg';
  } catch (err) {
    console.warn('Failed to compress image, using original', err);
  }

  if (s.provider === 'local_qwen') {
    const localBaseUrl = s.customBaseUrl || 'http://192.168.57.148:8001';
    return callLocalVision(localBaseUrl, processedImage);
  }

  if (!s.apiKey) throw new Error('API key not configured.');
  const targetModel = s.provider === 'custom' ? s.customModel : s.model;

  if (s.provider === 'gemini') {
    return callGemini(s.apiKey, targetModel, processedImage, mimeType);
  } else {
    return callOpenAICompatible(s.provider, s.apiKey, targetModel, processedImage, mimeType);
  }
};

export const askAboutIC = async (icName, question, icData) => {
  const s = getSettings();
  const prompt = `System Instruction: You are an electronics expert. You have access to technical data for a scanned IC: ${icData}. 
  The user is asking a question about a specific IC. 
  1. If the question is about the scanned IC (${icName}), use the provided data.
  2. If the user asks about a DIFFERENT IC (like 4001), answer based on your general knowledge.
  3. Keep answers direct and concise.
  User Question: ${question}`;

  if (s.provider === 'local_qwen') {
    const localBaseUrl = s.customBaseUrl || 'http://192.168.57.148:8001';
    return callLocalChat(localBaseUrl, prompt, 1000);
  }

  if (!s.apiKey) throw new Error('API key not configured.');
  const targetModel = s.provider === 'custom' ? s.customModel : s.model;

  if (s.provider === 'gemini') {
    return callGeminiChat(s.apiKey, targetModel, prompt); 
  } else {
    return callOpenAIChat(s.provider, s.apiKey, targetModel, prompt);
  }
};

export const generateVivaQuestions = async (icName, icData) => {
  const s = getSettings();
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

  if (s.provider === 'local_qwen') {
    const localBaseUrl = s.customBaseUrl || 'http://192.168.57.148:8001';
    const rawResponse = await callLocalChat(localBaseUrl, prompt, 2500);
    return extractJSON(rawResponse);
  }

  if (!s.apiKey) throw new Error('API key not configured.');
  const targetModel = s.provider === 'custom' ? s.customModel : s.model;

  if (s.provider === 'gemini') {
    return callGeminiViva(s.apiKey, targetModel, prompt);
  } else {
    return callOpenAIViva(s.provider, s.apiKey, targetModel, prompt);
  }
};

export const testConnection = async () => {
  const s = getSettings();

  if (s.provider === 'local_qwen') {
    const baseUrl = s.customBaseUrl || 'http://192.168.57.148:8001';
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/docs`);
      if (res.ok) return { ok: true, provider: 'Local Qwen VL', model: 'vLLM Qwen' };
      throw new Error(`Server returned status ${res.status}`);
    } catch (err) {
      throw new Error(`Could not connect to local server at ${baseUrl}. Details: ${err.message}`);
    }
  }

  if (!s.apiKey) throw new Error('Please enter an API key first.');
  return { ok: true, provider: s.provider, model: s.model };
};