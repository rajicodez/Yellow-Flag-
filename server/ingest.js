/**
 * Knowledge-base ingestion: reads server/knowledge/*.md, chunks them,
 * embeds each chunk with Gemini, and upserts into Qdrant.
 *
 * Usage:  npm run ingest
 * Needs:  GEMINI_API_KEY + QDRANT_URL (and QDRANT_API_KEY for Qdrant Cloud) in .env
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedText, getQdrant, isRagEnabled, COLLECTION, VECTOR_DIM } from './rag.js';
import { isGeminiConfigured } from './gemini.js';

const KNOWLEDGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'knowledge');
const MAX_CHUNK_CHARS = 900;

function chunkMarkdown(markdown, source) {
  const chunks = [];
  // Split on level-1/2 headings so each chunk stays on one topic.
  const sections = markdown.split(/\n(?=#{1,2} )/g);

  for (const section of sections) {
    const heading = section.match(/^#{1,2} (.+)/)?.[1]?.trim() ?? '';
    const body = section.replace(/^#{1,2} .+\n?/, '').trim();
    if (!body) continue;

    // Long sections get split again on paragraphs.
    let current = '';
    for (const paragraph of body.split(/\n\n+/)) {
      if (current && current.length + paragraph.length > MAX_CHUNK_CHARS) {
        chunks.push({ source, heading, text: current.trim() });
        current = '';
      }
      current += `${paragraph}\n\n`;
    }
    if (current.trim()) chunks.push({ source, heading, text: current.trim() });
  }

  return chunks.map((c) => ({
    ...c,
    text: c.heading ? `${c.heading}\n${c.text}` : c.text,
  }));
}

async function main() {
  if (!isGeminiConfigured()) {
    console.error('GEMINI_API_KEY is not set — add it to .env first.');
    process.exit(1);
  }
  if (!isRagEnabled()) {
    console.error('QDRANT_URL is not set — start Qdrant (Docker) or create a free Qdrant Cloud cluster, then add QDRANT_URL/QDRANT_API_KEY to .env.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(KNOWLEDGE_DIR, f));

  const chunks = files.flatMap((file) =>
    chunkMarkdown(fs.readFileSync(file, 'utf8'), path.basename(file, '.md'))
  );
  console.log(`Read ${files.length} file(s) → ${chunks.length} chunks.`);

  const qdrant = getQdrant();
  const existing = await qdrant.getCollections();
  if (existing.collections.some((c) => c.name === COLLECTION)) {
    console.log(`Recreating collection "${COLLECTION}"...`);
    await qdrant.deleteCollection(COLLECTION);
  }
  await qdrant.createCollection(COLLECTION, {
    vectors: { size: VECTOR_DIM, distance: 'Cosine' },
  });

  const points = [];
  for (const [i, chunk] of chunks.entries()) {
    const vector = await embedText(chunk.text, 'RETRIEVAL_DOCUMENT');
    points.push({
      id: i + 1,
      vector,
      payload: { text: chunk.text, source: chunk.source, heading: chunk.heading },
    });
    process.stdout.write(`\rEmbedded ${i + 1}/${chunks.length}`);
    await new Promise((r) => setTimeout(r, 120)); // stay well inside free-tier rate limits
  }
  console.log();

  await qdrant.upsert(COLLECTION, { wait: true, points });
  console.log(`Upserted ${points.length} points into "${COLLECTION}". RAG is ready.`);
}

main().catch((err) => {
  console.error('\nIngestion failed:', err);
  process.exit(1);
});
