import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, Volume2, Loader2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Full-screen voice-to-voice conversation modal.
 * States cycle: idle -> listening -> thinking -> speaking -> listening ...
 * Uses Web Speech API (STT + browser TTS), auto-restarts listening
 * once Bubble finishes speaking — feels like a real phone call.
 */
export default function VoiceCallModal({ open, onClose, sessionId }) {
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking | error
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [transcript, setTranscript] = useState([]); // [{role, text}]
  const recRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const liveTextRef = useRef("");
  const stoppingRef = useRef(false);
  const utteranceRef = useRef(null);
  const callActiveRef = useRef(false);
  const voiceRef = useRef(null);

  // Pick a nice English voice
  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    if (!voices.length) return null;
    const pref = voices.find(v => /Google.*US English|Samantha|Karen|Microsoft.*Aria|Microsoft.*Jenny/i.test(v.name))
      || voices.find(v => v.lang === "en-US")
      || voices.find(v => v.lang?.startsWith("en"))
      || voices[0];
    return pref;
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const handler = () => { voiceRef.current = pickVoice(); };
    window.speechSynthesis.onvoiceschanged = handler;
    handler();
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, [pickVoice]);

  const stopAll = useCallback(() => {
    callActiveRef.current = false;
    stoppingRef.current = true;
    try { recRef.current?.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  // Speak AI text, then resume listening
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) {
      // No TTS — go straight to listening
      if (callActiveRef.current) startListening();
      return;
    }
    setStatus("speaking");
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1.04;
    u.pitch = 1.05;
    u.onend = () => {
      utteranceRef.current = null;
      if (callActiveRef.current) startListening();
    };
    u.onerror = () => {
      utteranceRef.current = null;
      if (callActiveRef.current) startListening();
    };
    utteranceRef.current = u;
    try { window.speechSynthesis.speak(u); } catch (_) {}
  }, []);

  // Send user text to backend, then speak response
  const sendToAI = useCallback(async (text) => {
    if (!text || !callActiveRef.current) return;
    setStatus("thinking");
    setAiText("");
    setTranscript((t) => [...t, { role: "user", text }]);
    try {
      const res = await axios.post(`${API}/voice-chat`, {
        session_id: sessionId || localStorage.getItem("advisor_session_id"),
        message: text,
      }, { timeout: 60000 });
      const reply = (res.data?.reply || "Sorry, I didn't catch that. Could you say it again?").trim();
      if (!callActiveRef.current) return;
      setAiText(reply);
      setTranscript((t) => [...t, { role: "bot", text: reply }]);
      speak(reply);
    } catch (e) {
      if (!callActiveRef.current) return;
      const fallback = "Sorry, I had a hiccup connecting. Let's try again.";
      setAiText(fallback);
      speak(fallback);
    }
  }, [sessionId, speak]);

  // Start a fresh listening turn
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus("error"); return; }
    if (!callActiveRef.current) return;
    setUserText("");
    liveTextRef.current = "";
    stoppingRef.current = false;

    // Clean any prior recognizer
    try { recRef.current?.stop(); } catch (_) {}
    recRef.current = null;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    const resetSilence = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // ~1.6s of silence after speech => end this turn
        if (liveTextRef.current.trim()) {
          stoppingRef.current = true;
          try { r.stop(); } catch (_) {}
        }
      }, 1600);
    };

    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      liveTextRef.current = t;
      setUserText(t);
      resetSilence();
    };
    r.onerror = (e) => {
      // 'no-speech' or 'aborted' — try to restart if call is live
      if (callActiveRef.current && e?.error === "no-speech") {
        try { r.stop(); } catch (_) {}
      }
    };
    r.onend = () => {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      const finalText = liveTextRef.current.trim();
      if (!callActiveRef.current) return;
      if (finalText) {
        sendToAI(finalText);
      } else if (!stoppingRef.current) {
        // No speech captured — restart listening
        setTimeout(() => { if (callActiveRef.current) startListening(); }, 200);
      }
    };

    recRef.current = r;
    setStatus("listening");
    try { r.start(); } catch (_) {}
  }, [sendToAI]);

  const startCall = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus("error"); return; }
    callActiveRef.current = true;
    setTranscript([]);
    setAiText("");
    setUserText("");
    // Greet first so user knows we're live
    const greeting = "Hi! I'm Bubble. Tell me about your startup idea or ask me anything — I'm listening.";
    setAiText(greeting);
    setTranscript([{ role: "bot", text: greeting }]);
    speak(greeting);
  }, [speak]);

  const endCall = useCallback(() => {
    stopAll();
    setStatus("idle");
    onClose?.();
  }, [stopAll, onClose]);

  // Lifecycle on open/close
  useEffect(() => {
    if (open) {
      startCall();
    } else {
      stopAll();
      setStatus("idle");
      setUserText("");
      setAiText("");
      setTranscript([]);
    }
    return () => stopAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isError = status === "error";
  const isListening = status === "listening";
  const isThinking = status === "thinking";
  const isSpeaking = status === "speaking";

  const orbColor = isSpeaking
    ? "from-amber-300 via-amber-400 to-rose-400"
    : isThinking
    ? "from-violet-400 via-fuchsia-500 to-rose-400"
    : isListening
    ? "from-emerald-300 via-emerald-400 to-teal-500"
    : "from-amber-300 via-amber-400 to-amber-600";

  const label = isError
    ? "Voice not supported in this browser"
    : isSpeaking ? "Bubble is speaking…"
    : isThinking ? "Bubble is thinking…"
    : isListening ? "Listening — go ahead"
    : "Connecting…";

  return (
    <AnimatePresence>
      <motion.div
        key="voicecall"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{
          background: "radial-gradient(80% 60% at 50% 40%, rgba(18,12,30,0.95), rgba(7,7,13,0.98))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        data-testid="voice-call-modal"
      >
        {/* Background pulses */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: isListening ? [1, 1.2, 1] : isSpeaking ? [1, 1.35, 1] : [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: isListening ? 1.8 : 2.2 }}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-gradient-to-br ${orbColor} opacity-15 blur-3xl`}
          />
        </div>

        <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center text-center">
          <div className="chip mb-6"><Volume2 size={12} /> Voice-to-Voice with Bubble</div>

          {/* The breathing orb */}
          <motion.div
            className="relative w-56 h-56 md:w-64 md:h-64"
            animate={{ scale: isSpeaking ? [1, 1.06, 1] : isListening ? [1, 1.04, 1] : [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.9 : 2.2, ease: "easeInOut" }}
            data-testid="voice-call-orb"
          >
            {/* Outer ripples */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${orbColor} opacity-20`}
                animate={{ scale: [1, 1.5, 1.8], opacity: [0.35, 0.05, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.6, ease: "easeOut" }}
              />
            ))}
            {/* Core orb */}
            <div className={`absolute inset-6 rounded-full bg-gradient-to-br ${orbColor}`}
              style={{ boxShadow: "0 0 80px rgba(230,200,112,0.35), inset 0 4px 20px rgba(255,255,255,0.35), inset 0 -10px 30px rgba(0,0,0,0.45)" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              {isThinking ? (
                <Loader2 className="text-white/80 animate-spin" size={42} />
              ) : (
                <Mic className="text-white/95 drop-shadow" size={48} />
              )}
            </div>
          </motion.div>

          {/* Status pill */}
          <div className="mt-8 text-amber-100/90 text-sm tracking-[0.25em] uppercase font-semibold" data-testid="voice-call-status">
            {label}
          </div>

          {/* Live captions */}
          <div className="mt-6 w-full min-h-[5.5rem] glass p-5 text-left" data-testid="voice-call-captions">
            <AnimatePresence mode="wait">
              {(isListening || isThinking) && (
                <motion.div key="user" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-emerald-300 mb-1">You</div>
                  <div className="text-white/90 leading-relaxed text-base">
                    {userText || <span className="text-white/40 italic">…</span>}
                  </div>
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-amber-200 mb-1">Bubble</div>
                  <div className="text-white/90 leading-relaxed text-base">{aiText}</div>
                </motion.div>
              )}
              {!isListening && !isThinking && !isSpeaking && (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-sm italic">
                  Speak naturally — I'll auto-detect when you finish.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={endCall}
              className="lux-btn"
              style={{
                background: "radial-gradient(120% 200% at 0% 0%, #FCA5A5 0%, #EF4444 50%, #7F1D1D 100%)",
                color: "#fff",
                border: "1px solid rgba(252,165,165,0.5)",
                boxShadow: "0 14px 38px rgba(239,68,68,0.4), 0 1px 0 rgba(255,255,255,0.2) inset",
              }}
              data-testid="voice-call-end-btn"
            >
              <PhoneOff size={18} />
              <span className="relative z-10">End call</span>
            </button>
          </div>

          {/* Recent transcript history */}
          {transcript.length > 0 && (
            <details className="mt-6 w-full text-left" data-testid="voice-call-history">
              <summary className="text-xs t-mute cursor-pointer hover:text-amber-200">
                Conversation transcript ({transcript.length})
              </summary>
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2 pr-2">
                {transcript.map((m, i) => (
                  <div key={i} className={`text-sm ${m.role === "user" ? "text-emerald-200" : "text-amber-100"}`}>
                    <span className="font-bold mr-2">{m.role === "user" ? "You:" : "Bubble:"}</span>
                    {m.text}
                  </div>
                ))}
              </div>
            </details>
          )}

          {isError && (
            <div className="mt-4 text-rose-300 text-sm">
              Use Chrome / Edge desktop for voice. Safari & some mobile browsers don't support continuous speech yet.
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Small launcher button that opens the voice call modal */
export function VoiceCallButton({ onOpen, className = "", testid = "open-voice-call-btn", label = "Talk to Bubble" }) {
  return (
    <button
      onClick={onOpen}
      className={`lux-btn lux-btn-violet ${className}`}
      data-testid={testid}
    >
      <Phone size={18} className="relative z-10" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}
