import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, Phone } from "lucide-react";
import SpeechButton from "@/components/SpeechButton";
import RevealText from "@/components/RevealText";

const SAMPLES = [
  "An app that helps small farmers predict rainfall using cheap sensors",
  "Bite-sized mental health coaching for teens in local Indian languages",
  "AI tutor that teaches coding through multiplayer bubble games",
];

export default function Step1Idea({ onSubmit, loading, initial, onOpenVoiceCall }) {
  const [idea, setIdea] = useState(initial || "");
  const [listening, setListening] = useState(false);

  useEffect(() => { if (initial) setIdea(initial); }, [initial]);

  return (
    <div className="grid lg:grid-cols-5 gap-10 items-center">
      <div className="lg:col-span-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="chip mb-6"
          data-testid="hero-chip"
        >
          <Sparkles size={12} /> Step 01 · Seed your idea
        </motion.div>

        <RevealText
          as="span"
          text="Pop your startup idea"
          className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-white block mb-2"
        />
        <RevealText
          as="span"
          text="into the bubble."
          gold
          delay={0.35}
          className="font-display font-bold italic text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight block mb-7"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="text-white/60 text-lg max-w-xl mb-9 leading-relaxed"
        >
          Whisper or type your raw thought. Our AI maps your best field, surfaces real-world
          problems, scores novelty, finds funding and drafts a five-act roadmap — wrapped in
          a quiet, luxurious dossier.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="field p-4 sm:p-5 flex items-end gap-3"
          data-testid="idea-input-wrap"
        >
          <textarea
            data-testid="idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. 'An app that helps small farmers predict rainfall using cheap sensors'"
            className="flex-1 min-h-[120px] bg-transparent outline-none resize-none text-base leading-relaxed"
          />
          <SpeechButton
            listening={listening}
            setListening={setListening}
            onTranscript={(t) => setIdea(t)}
          />
        </motion.div>

        <div className="flex flex-wrap gap-2 mt-4" data-testid="sample-chips">
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              onClick={() => setIdea(s)}
              className="chip-soft hover:border-amber-300/40 transition rounded-full px-3 py-1.5"
              data-testid={`sample-chip-${i}`}
            >
              {s.length > 60 ? s.slice(0, 58) + "…" : s}
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
          className="mt-9 flex items-center gap-4 flex-wrap"
        >
          <button
            onClick={() => onSubmit(idea)}
            disabled={loading || !idea.trim()}
            className="lux-btn lux-btn-primary"
            data-testid="submit-idea-btn"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span className="relative z-10">{loading ? "Brewing insights…" : "Reveal my dossier"}</span>
            {!loading && <ArrowRight size={18} className="relative z-10" />}
          </button>
          <button
            onClick={onOpenVoiceCall}
            type="button"
            className="lux-btn lux-btn-violet"
            data-testid="step1-voice-call-btn"
          >
            <Phone size={18} className="relative z-10" />
            <span className="relative z-10">Talk to Bubble</span>
          </button>
          <span className="text-sm t-mute">Takes ~15 seconds</span>
        </motion.div>
      </div>

      <div className="lg:col-span-2 hidden lg:flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-[22rem] h-[22rem]"
          aria-hidden
        >
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(230,200,112,0.18) 0%, transparent 70%)" }} />
          {/* Concentric rings */}
          <div className="absolute inset-0 rounded-full border border-amber-300/15" />
          <div className="absolute inset-6 rounded-full border border-amber-300/10" />
          <div className="absolute inset-14 rounded-full border border-amber-300/5" />
          <motion.div
            className="absolute left-2 top-4 w-24 h-24 rounded-full glass flex items-center justify-center font-display font-semibold text-amber-200 italic"
            animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
          >Seed</motion.div>
          <motion.div
            className="absolute right-2 top-20 w-28 h-28 rounded-full glass flex items-center justify-center font-display font-semibold text-rose-200 italic"
            animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 0.4 }}
          >Bloom</motion.div>
          <motion.div
            className="absolute left-20 bottom-2 w-36 h-36 rounded-full glass-heavy flex items-center justify-center font-display font-semibold text-emerald-200 text-xl italic"
            animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 6, delay: 0.8 }}
          >Launch</motion.div>
        </motion.div>
      </div>
    </div>
  );
}
