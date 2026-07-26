import 'dotenv/config';
import express from 'express';
import { runChat } from './chat.js';
import { getEpisodes } from './episodes.js';
import { isGeminiConfigured, getAuthMode, CHAT_MODEL } from './gemini.js';
import { isRagEnabled } from './rag.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: CHAT_MODEL,
    authMode: getAuthMode(),
    gemini: isGeminiConfigured(),
    rag: isRagEnabled(),
  });
});

app.get('/api/episodes', async (_req, res) => {
  try {
    const payload = await getEpisodes();
    res.set('Cache-Control', 'public, max-age=900');
    res.json(payload);
  } catch (err) {
    console.error('[episodes]', err);
    res.status(502).json({
      error: 'episodes_failed',
      message: 'Could not load episodes from YouTube right now.',
    });
  }
});

app.post('/api/chat', async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      error: 'not_configured',
      message:
        getAuthMode() === 'vertex'
          ? "The assistant isn't configured yet — set the Vertex AI / service-account variables in the .env file and restart the server."
          : "The assistant isn't configured yet — add GEMINI_API_KEY to the .env file and restart the server.",
    });
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!messages?.length) {
    return res.status(400).json({ error: 'bad_request', message: 'Body must be { messages: [{ role, text }] }.' });
  }

  const history = messages
    .filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'bot'))
    .slice(-24);

  try {
    const reply = await runChat(history);
    res.json({ reply });
  } catch (err) {
    console.error('[chat]', err);
    res.status(err.status ?? 500).json({
      error: 'chat_failed',
      message: "Sorry — I hit a technical issue answering that. Give it another go in a moment.",
    });
  }
});

export default app;

// Local dev only — on Vercel the app is imported by api/index.js and the
// platform owns the listener.
const PORT = Number(process.env.PORT) || 8787;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Yellow Flag assistant API listening on http://localhost:${PORT}`);
    console.log(`  chat model : ${CHAT_MODEL}`);
    console.log(`  auth mode  : ${getAuthMode() === 'vertex' ? 'Vertex AI (Google Cloud service account)' : 'AI Studio (API key)'}`);
    console.log(`  gemini     : ${isGeminiConfigured() ? 'configured' : 'NOT configured — see .env.example'}`);
    console.log(`  rag/qdrant : ${isRagEnabled() ? 'enabled' : 'disabled (set QDRANT_URL to enable)'}`);
  });
}
