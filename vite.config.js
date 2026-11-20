import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin for local OpenRouter CSV token statistics logging.
 * Handles POST requests to /api/log-usage from the frontend
 * and appends token stats to openrouter_usage_log.csv in the project root.
 * Exactly 4 columns: Timestamp, Input_Tokens, Output_Tokens, Total_Tokens
 */
function openRouterCsvLogger() {
  const CSV_FILE = path.resolve(process.cwd(), 'openrouter_usage_log.csv');
  const CSV_HEADER = 'Timestamp,Input_Tokens,Output_Tokens,Total_Tokens\r\n';

  function formatReadableTimestamp(val) {
    const d = val ? (val instanceof Date ? val : new Date(val)) : new Date();
    if (isNaN(d.getTime())) return String(val || '');
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function escapeCsv(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function appendRow(entry) {
    try {
      if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, CSV_HEADER, { encoding: 'utf8' });
      }
      const row = [
        escapeCsv(entry.timestamp || formatReadableTimestamp()),
        escapeCsv(entry.inputTokens ?? ''),
        escapeCsv(entry.outputTokens ?? ''),
        escapeCsv(entry.totalTokens ?? '')
      ].join(',') + '\r\n';

      fs.appendFileSync(CSV_FILE, row, { encoding: 'utf8' });
      return true;
    } catch (err) {
      console.error('[CSV Logger Server] Error writing to CSV:', err.message);
      return false;
    }
  }

  const handleLogRequest = (req, res, next) => {
    if (req.url === '/api/log-usage' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const entry = JSON.parse(body || '{}');
          appendRow(entry);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          console.error('[CSV Logger Server] Invalid JSON payload:', err.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'openrouter-csv-logger',
    configureServer(server) {
      server.middlewares.use(handleLogRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleLogRequest);
    }
  };
}

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/IC_Scanner/' : '/',
  plugins: [react(), openRouterCsvLogger()],
});
