import { getSettings, isApiKeyConfigured, isModelConfigured } from '../config';
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

// ── OPENROUTER API INTEGRATION ──
async function callOpenRouter({ prompt, messages, responseFormat, temperature = 0.1, maxTokens = 4000, inputSummary }) {
  const s = getSettings();

  if (!isApiKeyConfigured(s.apiKey)) {
    throw new Error('OpenRouter API key is not configured. Please insert your API key in src/config.js, .env, or the configuration screen.');
  }

  if (!isModelConfigured(s.model)) {
    throw new Error('OpenRouter model identifier is not configured. Please set your verified OpenRouter model identifier (intended: Gemini 3.1 Flash) in src/config.js, .env, or the configuration screen.');
  }

  const endpoint = `${(s.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${s.apiKey.trim()}`,
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    'X-Title': 'IC Scanner',
  };

  const body = {
    model: s.model.trim(),
    messages: messages || [{ role: 'user', content: prompt }],
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
    throw new Error(`OpenRouter Network Error: ${netErr.message}`);
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = JSON.parse(rawText);
      errMsg = errJson?.error?.message || errJson?.detail || errMsg;
    } catch {}
    if (res.status === 401) {
      throw new Error(`OpenRouter Authentication Failed (401): Invalid or unauthorized API key.`);
    }
    throw new Error(`OpenRouter API Error (${res.status}): ${errMsg}`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('OpenRouter returned an unparseable response.');
  }

  const outputText = data.choices?.[0]?.message?.content || '';

  // Asynchronous local CSV token statistics logging (non-blocking)
  logApiUsage({
    usage: data.usage,
    timestamp: new Date(),
  }).catch(() => {});

  return outputText;
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

  const imageData = processedImage.includes(',') ? processedImage.split(',')[1] : processedImage;
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: SCAN_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
      ],
    },
  ];

  const rawText = await callOpenRouter({
    messages,
    responseFormat: { type: 'json_object' },
    temperature: 0.1,
    maxTokens: 4000,
    inputSummary: 'Identify IC from image',
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

  return callOpenRouter({
    prompt,
    temperature: 0.5,
    maxTokens: 2000,
    inputSummary: question || (icName ? `Explain ${icName}` : 'IC Question'),
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

  const rawText = await callOpenRouter({
    prompt,
    responseFormat: { type: 'json_object' },
    temperature: 0.4,
    maxTokens: 4000,
    inputSummary: `Generate viva questions for ${icName}`,
  });

  return extractJSON(rawText);
};

export const testConnection = async () => {
  const s = getSettings();
  if (!isApiKeyConfigured(s.apiKey)) {
    throw new Error('OpenRouter API key is not configured. Please enter your API key first.');
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${s.apiKey.trim()}`,
      },
    });

    if (res.status === 401) {
      throw new Error('Invalid OpenRouter API Key (401 Unauthorized).');
    }

    if (!res.ok) {
      const txt = await res.text();
      let msg = `HTTP ${res.status}`;
      try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
      throw new Error(`OpenRouter verification error (${res.status}): ${msg}`);
    }

    return { ok: true, provider: 'OpenRouter', model: s.model };
  } catch (err) {
    if (err.message.includes('Invalid OpenRouter API Key') || err.message.includes('OpenRouter verification error')) {
      throw err;
    }
    throw new Error(`OpenRouter Connection Error: ${err.message}`);
  }
};
