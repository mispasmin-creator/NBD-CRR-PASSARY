import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { fetchDashboardOverview } from '../../services/dashboardStats';
import { saveFormData, loadFormData, FORM_KEYS } from '../../services/localStorageService';

const SYSTEM_PERSONA = `You are "Assistant AI", the in-app assistant for Passary Refractories' NBD/CRR sales CRM.
You help users navigate and understand these modules: Dashboard, NBD Lead, CRR Enquiry, NBD Enquiry, Offer, Customer Complaint, Marketing Visit Tracker, Order Not Received, and Administration.
Answer concisely and helpfully, in short plain-text sentences only — this chat does not render markdown, so never use **bold**, bullet points, numbered lists, or headers. If a live data snapshot is provided below, use it to answer questions about current numbers accurately — do not invent figures. If asked something the snapshot doesn't cover, say you don't have that data rather than guessing.`;

// Keep localStorage bounded (chat history) and the API context window small (token cost) —
// the widget still shows full stored history, it just only resends the recent turns to Groq.
const MAX_STORED_MESSAGES = 40;
const MAX_CONTEXT_MESSAGES = 12;

const greetingMessage = () => ({
  id: 1,
  text: "Hi there! I'm your AI Assistant. How can I help you navigate the dashboard today?",
  sender: 'bot',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

const buildDataSnapshot = (overview) => {
  if (!overview) return "Live data snapshot is currently unavailable."
  const { totals, modules } = overview
  const lines = [
    `Company-wide: ${totals.total} total records — ${totals.pending} pending, ${totals.inProgress} in progress, ${totals.completed} completed, ${totals.delayed} delayed/needs attention.`,
    ...modules
      .filter((m) => m.available)
      .map((m) => `${m.label}: ${m.total} total — ${m.pending} pending, ${m.inProgress} in progress, ${m.completed} completed, ${m.delayed} delayed.`),
  ]
  return lines.join("\n")
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const stored = loadFormData(FORM_KEYS.CHAT_HISTORY);
    return Array.isArray(stored) && stored.length > 0 ? stored : [greetingMessage()];
  });
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const snapshotRef = useRef(null);
  const snapshotLoadedAt = useRef(0);
  const snapshotPromiseRef = useRef(null);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Persist chat history across reloads/navigation, capped so localStorage doesn't grow forever.
  useEffect(() => {
    saveFormData(FORM_KEYS.CHAT_HISTORY, messages.slice(-MAX_STORED_MESSAGES));
  }, [messages]);

  const handleClearHistory = () => {
    const fresh = [greetingMessage()];
    setMessages(fresh);
    saveFormData(FORM_KEYS.CHAT_HISTORY, fresh);
  };

  // Refresh the live data snapshot when the chat is opened (cheap, cached for 60s).
  // Kept as a promise so handleSend can await whatever fetch is in flight, instead of
  // racing it and answering data questions before the snapshot has actually loaded.
  useEffect(() => {
    if (!isOpen) return
    const isStale = Date.now() - snapshotLoadedAt.current > 60000
    if (!snapshotPromiseRef.current || isStale) {
      snapshotPromiseRef.current = fetchDashboardOverview()
        .then((overview) => {
          snapshotRef.current = overview
          snapshotLoadedAt.current = Date.now()
          return overview
        })
        .catch(() => null)
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const newUserMessage = {
      id: Date.now(),
      text: trimmed,
      sender: 'user',
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    const historyForApi = [...messages, newUserMessage]
      .filter((m) => m.sender === 'user' || m.sender === 'bot')
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      if (snapshotPromiseRef.current) await snapshotPromiseRef.current;

      const systemMessage = {
        role: 'system',
        content: `${SYSTEM_PERSONA}\n\nLive data snapshot:\n${buildDataSnapshot(snapshotRef.current)}`,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [systemMessage, ...historyForApi] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: data.reply,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `Sorry, I ran into an error: ${err.message}`,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 bg-white/80 backdrop-blur-xl w-[350px] sm:w-[400px] h-[500px] rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] border border-white flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-600 rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Assistant AI</h3>
                  <p className="text-xs text-indigo-100 opacity-90">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleClearHistory} title="Clear chat history" className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={toggleChat} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === 'user' ? 'bg-indigo-500 text-white rounded-tr-sm shadow-md shadow-indigo-500/20' : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100 shadow-sm'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[10px] mt-1.5 block ${msg.sender === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-white text-slate-400 border border-slate-100 shadow-sm">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isSending}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-full pl-5 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isSending}
                  className="absolute right-2 p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 translate-x-px translate-y-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className="pointer-events-auto bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-4 rounded-full shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] border border-indigo-400/30 flex items-center justify-center transition-all focus:outline-none"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        )}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
