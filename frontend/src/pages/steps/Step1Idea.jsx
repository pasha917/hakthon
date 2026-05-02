import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import SpeechButton from "@/components/SpeechButton";
import RevealText from "@/components/RevealText";
import RobotAvatar from "@/components/RobotAvatar";

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
          <span className="text-sm t-mute">Tap the robot to talk · any language</span>
        </motion.div>
      </div>

      <div className="lg:col-span-2 hidden lg:flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <RobotAvatar
            state="idle"
            size={300}
            onClick={onOpenVoiceCall}
            label="Talk to your AI co-founder"
          />
        </motion.div>
        <div className="mt-6 text-center">
          <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-amber-200/80">Your AI co-founder</div>
          <div className="font-display font-semibold text-2xl text-white mt-1 italic">Tap me. Speak any language.</div>
          <div className="text-sm t-soft mt-2 max-w-xs">I'll listen, understand, and reply in your language — Hindi, English, Tamil, Telugu, Spanish & more.</div>
        </div>
      </div>
    </div>
  );
}
