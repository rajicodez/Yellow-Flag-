import { QdrantClient } from '@qdrant/js-client-rest';
import { getAI, EMBED_MODEL } from './gemini.js';

export const COLLECTION = 'yellowflag_knowledge';
// gemini-embedding-001 supports Matryoshka truncation; 768 dims keeps Qdrant small
// with near-full retrieval quality. Vectors truncated below 3072 must be re-normalized.
export const VECTOR_DIM = 768;

const MIN_SCORE = 0.5;
const TOP_K = 4;

let qdrant = null;

export function isRagEnabled() {
  return Boolean(process.env.QDRANT_URL);
}

export function getQdrant() {
  if (!isRagEnabled()) {
    throw new Error('QDRANT_URL is not set — RAG is disabled.');
  }
  if (!qdrant) {
    qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY || undefined,
    });
  }
  return qdrant;
}

function l2Normalize(values) {
  let sumSquares = 0;
  for (const v of values) sumSquares += v * v;
  const norm = Math.sqrt(sumSquares);
  return norm === 0 ? values : values.map((v) => v / norm);
}

/**
 * @param {string} text
 * @param {'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'} taskType
 */
export async function embedText(text, taskType) {
  const res = await getAI().models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType, outputDimensionality: VECTOR_DIM },
  });
  const values = res?.embeddings?.[0]?.values;
  if (!values?.length) throw new Error('Gemini returned an empty embedding.');
  return l2Normalize(values);
}

/**
 * Retrieve knowledge-base snippets relevant to the user's question.
 * Returns a text block for the system prompt, or null when RAG is disabled,
 * empty, or failing — the chat must keep working without it.
 */
export async function retrieveContext(query) {
  if (!isRagEnabled()) return null;
  try {
    const vector = await embedText(query, 'RETRIEVAL_QUERY');
    const hits = await getQdrant().search(COLLECTION, {
      vector,
      limit: TOP_K,
      score_threshold: MIN_SCORE,
      with_payload: true,
    });
    if (!hits.length) return null;
    return hits
      .map((hit, i) => `[${i + 1}] (${hit.payload?.source ?? 'knowledge'}) ${hit.payload?.text ?? ''}`)
      .join('\n\n');
  } catch (err) {
    console.warn('[rag] retrieval skipped:', err.message);
    return null;
  }
}
