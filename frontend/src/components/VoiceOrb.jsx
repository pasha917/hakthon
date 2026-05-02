import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Send, Sparkles } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return () => { try { r.stop(); } catch (_) {} };
  }, []);

  const start = () => { if (recRef.current) { setTranscript(""); setListening(true); recRef.current.start(); } };
  const stop = () => { if (recRef.current) try { recRef.current.stop(); } catch (_) {} };
  return { supported, listening, transcript, setTranscript, start, stop };
}

function speak(text) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

export default function VoiceOrb() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi, I'm Bubble — your startup atelier co-pilot. Tap the mic or type to talk." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const rec = useSpeechRecognition();
  const scrollRef = useRef(null);

  useEffect(() => { if (rec.transcript) setInput(rec.transcript); }, [rec.transcript]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const sid = localStorage.getItem("advisor_session_id");
      const res = await axios.post(`${API}/voice-chat`, { session_id: sid, message: text });
      const reply = res.data.reply || "...";
      setMessages((m) => [...m, { role: "bot", text: reply }]);
      speak(reply);
    } catch (e) {
      toast.error("Voice chat failed. Try again.");
    } finally { setLoading(false); }
  };

  const toggleMic = () => {
    if (!rec.supported) { toast.error("Voice not supported in this browser"); return; }
    if (rec.listening) rec.stop(); else rec.start();
  };

  return (
    <>
      <motion.button
        data-testid="voice-orb-btn"
        onClick={() => setOpen((v) => !v)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 md:w-20 md:h-20 rounded-full text-white flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 30% 25%, #FFE5A4 0%, #E6C870 35%, #B68A3A 70%, #4B2E0B 100%)",
          boxShadow: "0 0 60px rgba(230,200,112,0.55), inset 0 1px 0 rgba(255,255,255,0.3)",
          border: "1px solid rgba(255,229,160,0.45)",
          color: "#1a1208",
        }}
        aria-label="Open voice assistant"
      >
        <span className="absolute inset-0 rounded-full pulse-ring" style={{ background: "rgba(230,200,112,0.45)" }} />
        <Mic className="relative" size={26} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="fixed bottom-28 right-6 z-40 w-[min(92vw,400px)] h-[540px] glass-heavy flex flex-col overflow-hidden"
            data-testid="voice-panel"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-200" />
                <span className="font-display font-semibold text-white">Bubble</span>
                <span className="chip">AI Mentor</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-white/5 text-white/70"
                data-testid="voice-panel-close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-amber-300/15 text-amber-100 border border-amber-300/25 rounded-br-sm"
                        : "bg-white/5 text-white/85 border border-white/10 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3 flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${
                  rec.listening
                    ? "bg-rose-500 text-white shadow-lg border-rose-400"
                    : "bg-white/5 text-amber-200 border-white/10 hover:bg-white/10"
                }`}
                data-testid="voice-mic-toggle"
                aria-label="Toggle microphone"
              >
                <Mic size={18} />
              </button>
              <input
                data-testid="voice-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={rec.listening ? "Listening…" : "Ask anything…"}
                className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-amber-300/50 text-white placeholder:text-white/30"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-full text-black flex items-center justify-center disabled:opacity-50"
                style={{ background: "radial-gradient(circle at 30% 25%, #FFE5A4, #E6C870 60%, #B68A3A 100%)" }}
                data-testid="voice-send"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
