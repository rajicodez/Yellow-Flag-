import { GoogleGenAI } from '@google/genai';

export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

// Two supported auth modes:
//  1. Vertex AI (Google Cloud)  — service account / ADC. Set GOOGLE_GENAI_USE_VERTEXAI=true.
//  2. AI Studio                 — a single GEMINI_API_KEY string.
const USE_VERTEX =
  String(process.env.GOOGLE_GENAI_USE_VERTEXAI).toLowerCase() === 'true';

let client = null;

export function getAuthMode() {
  return USE_VERTEX ? 'vertex' : 'api_key';
}

// Serverless hosts (Vercel) have no filesystem to point GOOGLE_APPLICATION_CREDENTIALS
// at and no ambient ADC, so the credential JSON is passed inline instead — either raw
// or base64-encoded, whichever survives the host's env-var editor.
let credsCache;
function inlineCredentials() {
  if (credsCache !== undefined) return credsCache;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return (credsCache = null);

  const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  let creds;
  try {
    creds = JSON.parse(text);
  } catch {
    const err = new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON could not be parsed. Paste the whole service-account JSON file, or its base64 encoding.'
    );
    err.status = 500;
    throw err;
  }

  // Env-var editors often turn the key's real newlines into literal "\n".
  if (typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  return (credsCache = creds);
}

function safeInlineCredentials() {
  try {
    return inlineCredentials();
  } catch {
    return null;
  }
}

function resolveProject() {
  const creds = safeInlineCredentials();
  return process.env.GOOGLE_CLOUD_PROJECT || creds?.project_id || creds?.quota_project_id || null;
}

export function isGeminiConfigured() {
  if (USE_VERTEX) {
    if (!resolveProject()) return false;
    // Off-platform there's no key file on disk and no ambient ADC to fall back on,
    // so inline credentials are the only way Vertex can authenticate.
    if (process.env.VERCEL) return Boolean(safeInlineCredentials());
    return true;
  }
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getAI() {
  if (!isGeminiConfigured()) {
    const err = new Error(
      USE_VERTEX
        ? 'Vertex AI is not configured. Set GOOGLE_CLOUD_PROJECT (and GOOGLE_CLOUD_LOCATION), then supply credentials: GOOGLE_SERVICE_ACCOUNT_JSON when hosted, or `gcloud auth application-default login` locally.'
        : 'GEMINI_API_KEY is not set. Create a key at https://aistudio.google.com/apikey and add it to .env.'
    );
    err.status = 503;
    throw err;
  }
  if (!client) {
    if (USE_VERTEX) {
      // Inline credentials win when present; otherwise google-auth-library falls back
      // to GOOGLE_APPLICATION_CREDENTIALS or ambient ADC, which is the local setup.
      const credentials = inlineCredentials();
      client = new GoogleGenAI({
        vertexai: true,
        project: resolveProject(),
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        ...(credentials ? { googleAuthOptions: { credentials } } : {}),
      });
    } else {
      client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }
  return client;
}
