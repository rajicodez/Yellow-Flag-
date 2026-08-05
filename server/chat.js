import { getAI, CHAT_MODEL } from './gemini.js';
import { buildSystemPrompt } from './systemPrompt.js';
import { functionDeclarations, executeTool } from './f1Tools.js';
import { retrieveContext } from './rag.js';

const MAX_TOOL_ROUNDS = 5;
const MAX_MESSAGE_CHARS = 4000;

/**
 * Run one chat turn.
 * @param {Array<{role: 'user' | 'bot', text: string}>} history — oldest first, last entry is the new user message.
 * @returns {Promise<string>} the assistant's reply
 */
export async function runChat(history) {
  const contents = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.text).slice(0, MAX_MESSAGE_CHARS) }],
  }));

  // Gemini requires the conversation to start with a user turn.
  while (contents.length && contents[0].role !== 'user') contents.shift();
  const last = contents.at(-1);
  if (!last || last.role !== 'user') {
    const err = new Error('The last message must be a user message.');
    err.status = 400;
    throw err;
  }

  const ragContext = await retrieveContext(last.parts[0].text);
  const systemInstruction = buildSystemPrompt(ragContext, last.parts[0].text);
  const ai = getAI();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations }],
        // Keep the widget snappy; raise the budget if tool planning ever struggles.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1024,
      },
    });

    const calls = response.functionCalls ?? [];
    if (!calls.length) {
      const text = response.text?.trim();
      if (!text) throw new Error('Gemini returned an empty response.');
      return text;
    }

    contents.push(response.candidates[0].content);
    const resultParts = [];
    for (const call of calls) {
      const result = await executeTool(call.name, call.args);
      resultParts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: resultParts });
  }

  throw new Error('Gave up after too many tool-call rounds.');
}
