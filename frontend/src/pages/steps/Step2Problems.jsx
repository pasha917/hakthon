import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Globe2 } from "lucide-react";
import RevealText from "@/components/RevealText";

const sevColor = (s) => ({
  High: "border-rose-400/40 text-rose-200 bg-rose-500/10",
  Medium: "border-amber-300/40 text-amber-200 bg-amber-400/10",
  Low: "border-emerald-400/40 text-emerald-200 bg-emerald-400/10",
}[s] || "border-white/10 text-white/70 bg-white/5");

export default function Step2Problems({ domain, whyFit, tags = [], problems = [], onPick, onBack }) {
  return (
    <div>
      <div className="mb-10">
        <div className="chip mb-4"><Globe2 size={12} /> Step 02 · Real world problems</div>
        <RevealText
          text={`Best-fit field: ${domain || "Exploring..."}`}
          className="font-display font-bold text-3xl sm:text-5xl text-white mb-4"
        />
        <p className="t-soft max-w-3xl text-base leading-relaxed">{whyFit}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {tags.map((t, i) => <span key={i} className="chip-soft" data-testid={`tag-${i}`}>#{t}</span>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-10">
        {problems.map((p, idx) => (
          <motion.button
            key={p.id || idx}
            onClick={() => onPick(p)}
            whileHover={{ y: -6 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * idx }}
            className="glass sheen lift p-7 text-left relative overflow-hidden"
            data-testid={`problem-card-${idx}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-display font-semibold text-2xl text-white leading-snug">{p.title}</h3>
              <span className={`text-[10px] tracking-widest uppercase font-bold rounded-full border px-2.5 py-1 ${sevColor(p.severity)}`}>
                {p.severity}
              </span>
            </div>
            <p className="t-soft text-sm mb-4 leading-relaxed">{p.summary}</p>
            <div className="text-xs text-amber-200/70 font-semibold tracking-wider uppercase">
              Impact · <span className="font-normal text-white/60 normal-case tracking-normal">{p.impact}</span>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 t-gold font-semibold text-sm">
              Solve this <ArrowRight size={14} />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-sm t-mute">Pick the problem that excites you most</span>
      </div>
    </div>
  );
}
