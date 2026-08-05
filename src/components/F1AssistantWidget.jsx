import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaDownLeftAndUpRightToCenter,
  FaPaperPlane,
  FaRobot,
  FaUpRightAndDownLeftFromCenter,
  FaXmark,
} from 'react-icons/fa6';

const TOOLTIP_SEEN_KEY = 'f1_ai_tooltip_seen';
const TOOLTIP_AUTO_HIDE_MS = 7000;

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'bot',
  text: "Welcome to the grid! I'm the Yellow Flag F1 Assistant. Ask me about the 2026 season, standings, F1 history — or the Yellow Flag podcast itself.",
};

const ERROR_MESSAGE =
  "Pit stop trouble — I couldn't reach the assistant. Check your connection and try again.";

export default function F1AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const messageListRef = useRef(null);

  const audioRef = useRef(null);
  const notifiedAssistantMessageIdsRef = useRef(new Set());

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  // Seed history on mount so we don't play sounds for existing messages
  useEffect(() => {
    messages.forEach((m) => {
      if (m.role === 'bot') {
        notifiedAssistantMessageIdsRef.current.add(m.id);
      }
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor for new completed bot messages
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];

    if (latestMessage && latestMessage.role === 'bot') {
      const isStreaming = latestMessage.isStreaming === true;
      const id = latestMessage.id;

      if (!isStreaming && !notifiedAssistantMessageIdsRef.current.has(id)) {
        notifiedAssistantMessageIdsRef.current.add(id);

        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          const p = audioRef.current.play();
          if (p !== undefined) {
            p.catch((err) => {
              console.warn('[F1AssistantWidget] Notification playback failed:', err);
            });
          }
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(TOOLTIP_SEEN_KEY);

    if (alreadySeen) return;

    setShowTooltip(true);
    sessionStorage.setItem(TOOLTIP_SEEN_KEY, 'true');

    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, TOOLTIP_AUTO_HIDE_MS);

    return () => clearTimeout(timer);
  }, []);

  function handleToggleOpen() {
    setShowTooltip(false);
    setIsOpen((prev) => !prev);
  }

  function handleClose() {
    setIsOpen(false);
    setIsMaximized(false);
  }

  async function handleSend(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    // Prepare audio on user interaction to unlock browser restrictions
    if (!audioRef.current) {
      audioRef.current = new Audio('/audio/open-sound.mp3');
      audioRef.current.preload = 'auto';
      audioRef.current.loop = false;
      audioRef.current.volume = 0.6;
    }
    try {
      audioRef.current.load();
    } catch (e) {
      // Ignore load errors safely
    }

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== 'welcome')
            .map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      const reply =
        response.ok && data.reply ? data.reply : data.message || ERROR_MESSAGE;
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, role: 'bot', text: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, role: 'bot', text: ERROR_MESSAGE },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: isMaximized
                ? 'min(30rem, calc(100vw - 2.5rem))'
                : 'min(22rem, calc(100vw - 2.5rem))',
              height: isMaximized ? 'min(36rem, 85vh)' : 'min(28rem, 70vh)',
            }}
            className="flex flex-col overflow-hidden rounded-[1.75rem] border border-yellow-400/20 bg-[#0a0a0a]/95 shadow-[0_0_50px_rgba(250,204,21,0.12),0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[width,height] duration-300 ease-out"
          >
            <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-black via-[#111] to-black px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.25)]">
                  <FaRobot className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">
                    F1 AI Assistant
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Yellow Flag · Ask about F1
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaximized((prev) => !prev)}
                  aria-label={isMaximized ? 'Shrink F1 assistant' : 'Enlarge F1 assistant'}
                  aria-pressed={isMaximized}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-yellow-400/40 hover:bg-yellow-400/10 hover:text-yellow-300"
                >
                  {isMaximized ? (
                    <FaDownLeftAndUpRightToCenter className="h-3 w-3" />
                  ) : (
                    <FaUpRightAndDownLeftFromCenter className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close F1 assistant"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white"
                >
                  <FaXmark className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-yellow-400 text-black'
                        : 'rounded-bl-md border border-white/10 bg-white/[0.06] text-zinc-200'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-3">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-yellow-400/80"
                        style={{ animationDelay: `${dot * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="border-t border-white/10 bg-black/60 p-3"
            >
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-yellow-400/40">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type your question..."
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white outline-none placeholder:text-zinc-500"
                  aria-label="Ask the F1 assistant"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!input.trim() || isTyping}
                >
                  <FaPaperPlane className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.span
              key="ask-badge"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="hidden rounded-full border border-yellow-400/25 bg-black/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-300 shadow-[0_0_24px_rgba(250,204,21,0.15)] backdrop-blur-md sm:inline-block"
            >
              Ask me about F1
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={handleToggleOpen}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isOpen ? 'Close F1 assistant' : 'Open F1 assistant'}
          aria-expanded={isOpen}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/40 bg-[#0c0c0c] text-yellow-300 shadow-[0_0_28px_rgba(250,204,21,0.35),0_0_8px_rgba(220,38,38,0.25)] transition hover:border-yellow-400/70 hover:shadow-[0_0_36px_rgba(250,204,21,0.5),0_0_12px_rgba(220,38,38,0.35)]"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/15 via-transparent to-red-600/20" />
          {isOpen ? <FaXmark className="relative h-5 w-5" /> : <FaRobot className="relative h-6 w-6" />}
        </motion.button>
      </div>
    </div>
  );
}
