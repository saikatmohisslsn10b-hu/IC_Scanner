/**
 * OpenRouter CSV Token Statistics Logger
 * 
 * Records ONLY token usage statistics for each API call:
 * 1. Timestamp: date and time of the API request
 * 2. Input_Tokens: actual prompt/input token count returned by OpenRouter
 * 3. Output_Tokens: actual completion/output token count returned by OpenRouter
 * 4. Total_Tokens: actual total token count or sum of input + output tokens
 * 
 * Note: Never logs prompt text, user input, IC name, raw JSON, or API response text.
 * Opens cleanly as a 4-column table in Microsoft Excel.
 */

export const CSV_FILENAME = 'openrouter_usage_log.csv';
export const CSV_HEADERS = 'Timestamp,Input_Tokens,Output_Tokens,Total_Tokens';

/**
 * Formats a Date object or date string into a consistent readable format:
 * DD-MM-YYYY HH:mm:ss (e.g. 20-11-2026 15:25:30)
 */
export function formatReadableTimestamp(dateInput) {
  const d = dateInput ? (dateInput instanceof Date ? dateInput : new Date(dateInput)) : new Date();
  if (isNaN(d.getTime())) return String(dateInput || '');
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Escapes a field for CSV format according to RFC 4180.
 */
export function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Resolves token statistics from actual OpenRouter usage metadata.
 * Uses actual metadata, never estimated counts. Leaves missing values blank.
 */
export function resolveTokenStats(usage) {
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
 * Formats a 4-column token-only CSV row: Timestamp,Input_Tokens,Output_Tokens,Total_Tokens
 */
export function formatCsvRow(params) {
  const p = params || {};
  const row = [
    escapeCsvField(formatReadableTimestamp(p.timestamp)),
    escapeCsvField(p.inputTokens ?? ''),
    escapeCsvField(p.outputTokens ?? ''),
    escapeCsvField(p.totalTokens ?? '')
  ].join(',');
  return row + '\r\n';
}

/**
 * Logs OpenRouter token statistics to the local CSV log.
 * In a browser environment, sends a POST request to Vite's local dev server middleware (/api/log-usage).
 * In a Node.js environment, directly appends to the local CSV file.
 * Non-blocking: Logging errors never interrupt or crash the main application.
 */
export async function logApiUsage(params) {
  try {
    const p = params || {};
    const { inputTokens, outputTokens, totalTokens } = resolveTokenStats(p.usage);
    const entry = {
      timestamp: formatReadableTimestamp(p.timestamp),
      inputTokens,
      outputTokens,
      totalTokens,
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
    console.warn('[CSV Logger] Failed to record token usage:', err.message);
  }
}
