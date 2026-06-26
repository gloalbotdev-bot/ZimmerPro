import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Load client env vars EXCLUSIVELY from .env.client.
// We do not use Vite's automatic .env / .env.local loading on the client.
function loadClientEnv(): Record<string, string> {
  const file = path.resolve(__dirname, '.env.client');
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf-8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export default defineConfig(() => {
  // Local dev: read from .env.client (gitignored).
  // Deploy (Render): .env.client isn't in the repo, so VITE_* / GEMINI_API_KEY
  // come from the platform's env vars (process.env), which override the file.
  const env: Record<string, string> = { ...loadClientEnv() };
  for (const [key, val] of Object.entries(process.env)) {
    if ((key.startsWith('VITE_') || key === 'GEMINI_API_KEY') && val != null) {
      env[key] = val;
    }
  }

  const define: Record<string, string> = {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  };

  // Expose every VITE_* var from .env.client to import.meta.env.
  for (const [key, val] of Object.entries(env)) {
    if (key.startsWith('VITE_')) {
      define[`import.meta.env.${key}`] = JSON.stringify(val);
    }
  }

  return {
    // Point envDir at a non-existent folder so Vite's built-in loader
    // never picks up .env / .env.local — the client uses only .env.client.
    envDir: path.resolve(__dirname, '.no-auto-env'),
    server: {
      port: 5173, // Vite default port (frontend)
      host: '0.0.0.0',
    },
    plugins: [react()],
    define,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
