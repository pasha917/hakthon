import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2, AlertTriangle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Premium voice-to-voice using MediaRecorder -> /api/stt (Whisper) -> /api/voice-chat -> /api/tts.
 * Works in any modern browser with mic permission (no Web Speech dependency).
 * Voice Activity Detection via Web Audio API (RMS) auto-stops recording on silence.
 */
export default function VoiceCallModal({ open, onClose, sessionId, mode = "advisor" }) {
  const [status, setStatus] = useState("idle"); // idle | recording | thinking | speaking | error
  const [errorMsg, setErrorMsg] = useState("");
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [transcript, setTranscript] = useState([]);

  const callActiveRef = useRef(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const speakingStartRef = useRef(0);
  const silenceStartRef = useRef(0);
  const audioElRef = useRef(null);

  const endpointChat = mode === "pitch" ? "/pitch-practice" : "/voice-chat";

  const cleanup = useCallback(() => {
    callActiveRef.current = false;
    try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch (_) {}
    rafRef.current = null;
    try { mediaRecorderRef.current?.stop(); } catch (_) {}
    mediaRecorderRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch (_) {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (audioElRef.current) {
      try { audioElRef.current.pause(); } catch (_) {}
      try { URL.revokeObjectURL(audioElRef.current.src); } catch (_) {}
      audioElRef.current = null;
    }
  }, []);

  const playReplyAudio = useCallback(async (text) => {
    setStatus("speaking");
    try {
      const res = await axios.post(`${API}/tts`, { text, voice: "nova", model: "tts-1", speed: 1.05 }, {
        responseType: "blob", timeout: 30000,
      });
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audioElRef.current = audio;
      audio.onended = () => {
        try { URL.revokeObjectURL(url); } catch (_) {}
        if (callActiveRef.current) startRecording();
      };
      audio.onerror = () => {
        if (callActiveRef.current) startRecording();
      };
      await audio.play();
    } catch (e) {
      // Fallback: skip TTS, go straight to listening
      if (callActiveRef.current) startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendToAI = useCallback(async (text) => {
    if (!text || !callActiveRef.current) return;
    setStatus("thinking");
    setAiText("");
    setTranscript((t) => [...t, { role: "user", text }]);
    try {
      const res = await axios.post(`${API}${endpointChat}`, {
        session_id: sessionId || localStorage.getItem("advisor_session_id"),
        message: text,
        persona: mode === "pitch" ? "tough" : undefined,
      }, { timeout: 60000 });
      const reply = (res.data?.reply || "Sorry, I didn't catch that.").trim();
      if (!callActiveRef.current) return;
      setAiText(reply);
      setTranscript((t) => [...t, { role: "bot", text: reply }]);
      playReplyAudio(reply);
    } catch (e) {
      if (!callActiveRef.current) return;
      const fallback = "Sorry, I had a hiccup. Could you try once more?";
      setAiText(fallback);
      setTranscript((t) => [...t, { role: "bot", text: fallback }]);
      playReplyAudio(fallback);
    }
  }, [sessionId, endpointChat, mode, playReplyAudio]);

  const transcribeBlob = useCallback(async (blob) => {
    setStatus("thinking");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "speech.webm");
      const res = await axios.post(`${API}/stt`, fd, { timeout: 30000, headers: { "Content-Type": "multipart/form-data" } });
      const text = (res.data?.text || "").trim();
      setUserText(text);
      if (!text) {
        if (callActiveRef.current) startRecording();
        return;
      }
      sendToAI(text);
    } catch (e) {
      setErrorMsg("Transcription failed. Trying again…");
      if (callActiveRef.current) startRecording();
    }
  }, [sendToAI]);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch (_) {}
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startRecording = useCallback(() => {
    if (!callActiveRef.current) return;
    if (!streamRef.current) return;
    audioChunksRef.current = [];
    setUserText("");
    setStatus("recording");

    let mr;
    try {
      mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm;codecs=opus" });
    } catch (_) {
      try { mr = new MediaRecorder(streamRef.current); } catch (e) {
        setStatus("error");
        setErrorMsg("MediaRecorder isn't supported in this browser.");
        return;
      }
    }
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
      if (blob.size < 1500) {
        // Likely silent — restart
        if (callActiveRef.current) setTimeout(() => callActiveRef.current && startRecording(), 200);
        return;
      }
      transcribeBlob(blob);
    };
    try { mr.start(150); } catch (_) {}

    // Voice Activity Detection: stop on ~1.4s silence (after speech started)
    speakingStartRef.current = 0;
    silenceStartRef.current = 0;
    const analyser = analyserRef.current;
    if (!analyser) {
      // Fallback: max 8s recording
      setTimeout(() => { if (mr.state === "recording") stopRecording(); }, 8000);
      return;
    }
    const buf = new Float32Array(analyser.fftSize);
    let started = Date.now();
    const tick = () => {
      if (mr.state !== "recording") return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      const speaking = rms > 0.012;
      if (speaking) {
        if (!speakingStartRef.current) speakingStartRef.current = now;
        silenceStartRef.current = 0;
      } else if (speakingStartRef.current) {
        if (!silenceStartRef.current) silenceStartRef.current = now;
        if (now - silenceStartRef.current > 1400) {
          stopRecording();
          return;
        }
      } else if (now - started > 9000) {
        // No speech detected for 9s — restart loop
        try { mr.stop(); } catch (_) {}
        return;
      }
      // Hard cap 30s
      if (now - started > 30000) { stopRecording(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRecording, transcribeBlob]);

  const startCall = useCallback(async () => {
    setErrorMsg("");
    setTranscript([]);
    setAiText("");
    setUserText("");
    callActiveRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMsg("This browser does not support microphone capture.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      // Start recording immediately
      startRecording();
    } catch (e) {
      callActiveRef.current = false;
      setStatus("error");
      setErrorMsg(
        "Microphone access blocked. Click the 🔒 / camera-mic icon in your browser's address bar → Site settings → Microphone → Allow → Reload this page."
      );
    }
  }, [startRecording]);

  const endCall = useCallback(() => {
    cleanup();
    setStatus("idle");
    onClose?.();
  }, [cleanup, onClose]);

  const retry = useCallback(() => {
    cleanup();
    setStatus("idle");
    setErrorMsg("");
    startCall();
  }, [cleanup, startCall]);

  useEffect(() => {
    if (open) startCall();
    else { cleanup(); setStatus("idle"); setUserText(""); setAiText(""); setTranscript([]); setErrorMsg(""); }
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isError = status === "error";
  const isRecording = status === "recording";
  const isThinking = status === "thinking";
  const isSpeaking = status === "speaking";

  const orbColor = isSpeaking
    ? "from-amber-300 via-amber-400 to-rose-400"
    : isThinking
    ? "from-violet-400 via-fuchsia-500 to-rose-400"
    : isRecording
    ? "from-emerald-300 via-emerald-400 to-teal-500"
    : isError
    ? "from-rose-400 via-rose-500 to-rose-700"
    : "from-amber-300 via-amber-400 to-amber-600";

  const label = isError
    ? "Voice unavailable"
    : isSpeaking ? (mode === "pitch" ? "Investor is speaking…" : "Bubble is speaking…")
    : isThinking ? "Thinking…"
    : isRecording ? "Listening — go ahead"
    : "Connecting mic…";

  return (
    <AnimatePresence>
      <motion.div
        key="voicecall"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(80% 60% at 50% 40%, rgba(18,12,30,0.95), rgba(7,7,13,0.98))",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}
        data-testid="voice-call-modal"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: isRecording ? [1, 1.2, 1] : isSpeaking ? [1, 1.35, 1] : [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: isRecording ? 1.8 : 2.2 }}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-gradient-to-br ${orbColor} opacity-15 blur-3xl`}
          />
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
          <div className="chip mb-6">
            <Volume2 size={12} />
            {mode === "pitch" ? "Investor Pitch Practice" : "Voice-to-Voice with Bubble"}
          </div>

          <motion.div
            className="relative w-56 h-56 md:w-64 md:h-64"
            animate={{ scale: isSpeaking ? [1, 1.06, 1] : isRecording ? [1, 1.04, 1] : [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.9 : 2.2, ease: "easeInOut" }}
            data-testid="voice-call-orb"
          >
            {[0, 1, 2].map((i) => (
              <motion.div key={i}
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${orbColor} opacity-20`}
                animate={{ scale: [1, 1.5, 1.8], opacity: [0.35, 0.05, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.6, ease: "easeOut" }}
              />
            ))}
            <div className={`absolute inset-6 rounded-full bg-gradient-to-br ${orbColor}`}
              style={{ boxShadow: "0 0 80px rgba(230,200,112,0.35), inset 0 4px 20px rgba(255,255,255,0.35), inset 0 -10px 30px rgba(0,0,0,0.45)" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              {isThinking ? <Loader2 className="text-white/80 animate-spin" size={42} />
                : isError ? <MicOff className="text-white/95" size={48} />
                : <Mic className="text-white/95 drop-shadow" size={48} />}
            </div>
          </motion.div>

          <div className="mt-8 text-amber-100/90 text-sm tracking-[0.25em] uppercase font-semibold" data-testid="voice-call-status">
            {label}
          </div>

          <div className="mt-6 w-full min-h-[5.5rem] glass p-5 text-left" data-testid="voice-call-captions">
            <AnimatePresence mode="wait">
              {(isRecording || isThinking) && (
                <motion.div key="user" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-emerald-300 mb-1">You</div>
                  <div className="text-white/90 leading-relaxed text-base">
                    {userText || <span className="text-white/40 italic">Speak whenever you're ready…</span>}
                  </div>
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-amber-200 mb-1">
                    {mode === "pitch" ? "Investor" : "Bubble"}
                  </div>
                  <div className="text-white/90 leading-relaxed text-base">{aiText}</div>
                </motion.div>
              )}
              {isError && (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-300 text-sm flex gap-2 items-start">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMsg || "Voice unavailable."}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center gap-3 flex-wrap justify-center">
            {isError ? (
              <button onClick={retry} type="button" className="lux-btn lux-btn-ghost" data-testid="voice-call-retry">
                <Mic size={18} /> <span>Try again</span>
              </button>
            ) : (
              <button onClick={() => { stopRecording(); startRecording(); }} type="button" className="lux-btn lux-btn-ghost" data-testid="voice-call-mic-tap">
                <Mic size={18} /> <span>Restart turn</span>
              </button>
            )}
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

          {transcript.length > 0 && (
            <details className="mt-6 w-full text-left" data-testid="voice-call-history">
              <summary className="text-xs t-mute cursor-pointer hover:text-amber-200">Conversation transcript ({transcript.length})</summary>
              <div className="mt-3 max-h-40 overflow-y-auto space-y-2 pr-2">
                {transcript.map((m, i) => (
                  <div key={i} className={`text-sm ${m.role === "user" ? "text-emerald-200" : "text-amber-100"}`}>
                    <span className="font-bold mr-2">{m.role === "user" ? "You:" : (mode === "pitch" ? "Investor:" : "Bubble:")}</span>{m.text}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function VoiceCallButton({ onOpen, className = "", testid = "open-voice-call-btn", label = "Talk to Bubble" }) {
  return (
    <button onClick={onOpen} type="button" className={`lux-btn lux-btn-violet ${className}`} data-testid={testid}>
      <Phone size={18} className="relative z-10" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}
