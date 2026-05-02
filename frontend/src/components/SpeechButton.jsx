import React, { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";

/** Inline dictation button used in the Step 1 textarea */
export default function SpeechButton({ onTranscript, listening, setListening }) {
  const recRef = useRef(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      onTranscript(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return () => { try { r.stop(); } catch (_) {} };
  }, [onTranscript, setListening]);

  const toggle = () => {
    if (!supported) { toast.error("Voice input not supported in this browser"); return; }
    if (listening) { try { recRef.current.stop(); } catch (_) {} setListening(false); }
    else { try { recRef.current.start(); setListening(true); } catch (_) {} }
  };

  return (
    <button
      onClick={toggle}
      type="button"
      data-testid="dictate-btn"
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
        listening
          ? "bg-rose-500 text-white shadow-[0_0_0_8px_rgba(244,63,94,0.15)]"
          : "bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50"
      }`}
      aria-label="Dictate"
    >
      <Mic size={20} />
    </button>
  );
}
