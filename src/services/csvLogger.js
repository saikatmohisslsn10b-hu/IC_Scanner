/**
 * OpenRouter CSV Token & Usage Logger
 * 
 * Records every successful OpenRouter API call to a local CSV file.
 * Columns: Timestamp, Input, Output, Input_Tokens, Output_Tokens, Total_Tokens, Model
 * 
 * - RFC 4180 compliant escaping for quotes, commas, and newlines.
 * - Extracts actual token usage from OpenRouter metadata.
 * - Calculates Total_Tokens using reported input and output tokens.
 * - Handles missing usage metadata safely.
 * - Non-blocking: Logging errors never interrupt or crash the application.
 */

export const CSV_FILENAME = 'openrouter_usage_log.csv';
export const CSV_HEADERS = 'Timestamp,Input,Output,Input_Tokens,Output_Tokens,Total_Tokens,Model';

/**
 * Escapes a field for CSV format according to RFC 4180.
 * Wraps fields containing commas, quotes, or newlines in double quotes,
 * and doubles any internal double quotes.
 */
export function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an API call entry as a single RFC 4180 CSV row.
 */
export function formatCsvRow(params) {
  const p = params || {};
  const row = [
    escapeCsvField(p.timestamp || new Date().toISOString()),
    escapeCsvField(p.input || ''),
    escapeCsvField(p.output || ''),
    escapeCsvField(p.inputTokens ?? ''),
    escapeCsvField(p.outputTokens ?? ''),
    escapeCsvField(p.totalTokens ?? ''),
    escapeCsvField(p.model || '')
  ].join(',');
  return row + '\r\n';
}

/**
 * Resolves token counts from OpenRouter response usage metadata.
 * Calculates Total_Tokens using reported input and output token counts,
 * and handles missing metadata safely.
 */
export function resolveTokenUsage(usage) {
  const inputTokens = (typeof usage?.prompt_tokens === 'number')
    ? usage.prompt_tokens
    : (typeof usage?.input_tokens === 'number' ? usage.input_tokens : '');

  const outputTokens = (typeof usage?.completion_tokens === 'number')
    ? usage.completion_tokens
    : (typeof usage?.output_tokens === 'number' ? usage.output_tokens : '');

  let totalTokens = '';
  if (typeof inputTokens === 'number' && typeof outputTokens === 'number') {
    totalTokens = inputTokens + outputTokens;
  } else if (typeof usage?.total_tokens === 'number') {
    totalTokens = usage.total_tokens;
  } else if (typeof inputTokens === 'number') {
    totalTokens = inputTokens;
  } else if (typeof outputTokens === 'number') {
    totalTokens = outputTokens;
  }

  return { inputTokens, outputTokens, totalTokens };
}

/**
 * Logs an OpenRouter API interaction to the local CSV log.
 * In a browser environment, sends a POST request to Vite's local dev server middleware (/api/log-usage).
 * In a Node.js environment, directly appends to the local CSV file.
 * Logging errors are caught and logged to console.warn without throwing.
 */
export async function logApiUsage(params) {
  try {
    const p = params || {};
    const { inputTokens, outputTokens, totalTokens } = resolveTokenUsage(p.usage);
    const entry = {
      timestamp: p.timestamp || new Date().toISOString(),
      input: p.input || '',
      output: p.output || '',
      inputTokens,
      outputTokens,
      totalTokens,
      model: p.model || ''
    };

    // Node.js environment (e.g. testing)
    if (typeof window === 'undefined') {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const filePath = path.resolve(process.cwd(), CSV_FILENAME);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, CSV_HEADERS + '\r\n', { encoding: 'utf8' });
        }
        fs.appendFileSync(filePath, formatCsvRow(entry), { encoding: 'utf8' });
      } catch (nodeErr) {
        console.warn('[CSV Logger Node] Error appending to CSV:', nodeErr.message);
      }
      return;
    }

    // Browser environment (calling local Vite dev server endpoint)
    if (typeof window.fetch === 'function') {
      await fetch('/api/log-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(fetchErr => {
        console.warn('[CSV Logger] Network call to /api/log-usage failed:', fetchErr.message);
      });
    }
  } catch (err) {
    // Non-blocking: CSV logging errors must not crash or interrupt the main application
    console.warn('[CSV Logger] Failed to record API usage:', err.message);
  }
}
