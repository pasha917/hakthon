import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import SpeechButton from "@/components/SpeechButton";

const SAMPLES = [
  "An app that helps small farmers predict rainfall using cheap sensors",
  "Bite-sized mental health coaching for teens in local Indian languages",
  "AI tutor that teaches coding through multiplayer bubble games",
];

export default function Step1Idea({ onSubmit, loading, initial }) {
  const [idea, setIdea] = useState(initial || "");
  const [listening, setListening] = useState(false);

  useEffect(() => { if (initial) setIdea(initial); }, [initial]);

  return (
    <div className="grid lg:grid-cols-5 gap-8 items-center">
      <div className="lg:col-span-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="chip mb-5"
          data-testid="hero-chip"
        >
          <Sparkles size={14} /> STEP 1 · SEED YOUR IDEA
        </motion.div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-indigo-950 leading-tight tracking-tight mb-5">
          Pop your startup idea <br />
          <span className="bg-gradient-to-r from-indigo-600 to-rose-500 bg-clip-text text-transparent">
            into the bubble.
          </span>
        </h1>
        <p className="text-indigo-900/70 text-lg max-w-xl mb-8">
          Tell us your raw thought — typed or spoken. Our AI will map your best field,
          surface real world problems, analyze novelty, find funding, and draft a full
          go-to-market roadmap in five playful steps.
        </p>

        <div className="glass rounded-3xl p-4 sm:p-5 flex items-end gap-3" data-testid="idea-input-wrap">
          <textarea
            data-testid="idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. 'An app that helps small farmers predict rainfall using cheap sensors'"
            className="flex-1 min-h-[120px] bg-transparent outline-none resize-none text-indigo-950 placeholder:text-indigo-900/40 text-base leading-relaxed"
          />
          <SpeechButton
            listening={listening}
            setListening={setListening}
            onTranscript={(t) => setIdea(t)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4" data-testid="sample-chips">
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              onClick={() => setIdea(s)}
              className="chip hover:bg-indigo-100 transition"
              data-testid={`sample-chip-${i}`}
            >
              {s.length > 60 ? s.slice(0, 58) + "…" : s}
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => onSubmit(idea)}
            disabled={loading || !idea.trim()}
            className="bubble-btn bubble-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            data-testid="submit-idea-btn"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? "Brewing insights..." : "Analyze my idea"}
            {!loading && <ArrowRight size={18} />}
          </button>
          <span className="text-sm text-indigo-900/60">Takes ~15 seconds</span>
        </div>
      </div>

      <div className="lg:col-span-2 hidden lg:flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative w-80 h-80"
          aria-hidden
        >
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #E0E7FF 0%, transparent 70%)" }} />
          <motion.div
            className="absolute left-6 top-6 w-24 h-24 rounded-full glass-heavy flex items-center justify-center font-display font-bold text-indigo-700"
            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
          >
            Seed
          </motion.div>
          <motion.div
            className="absolute right-0 top-16 w-28 h-28 rounded-full glass-heavy flex items-center justify-center font-display font-bold text-rose-600"
            animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 0.4 }}
          >
            Bloom
          </motion.div>
          <motion.div
            className="absolute left-16 bottom-4 w-36 h-36 rounded-full glass-heavy flex items-center justify-center font-display font-bold text-emerald-600 text-lg"
            animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 6, delay: 0.8 }}
          >
            Launch 🚀
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
