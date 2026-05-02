import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Globe2 } from "lucide-react";

const sevColor = (s) => ({
  High: "bg-rose-50 text-rose-700 border-rose-100",
  Medium: "bg-amber-50 text-amber-700 border-amber-100",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-100",
}[s] || "bg-indigo-50 text-indigo-700 border-indigo-100");

export default function Step2Problems({ domain, whyFit, tags = [], problems = [], onPick, onBack }) {
  return (
    <div>
      <div className="mb-8">
        <div className="chip mb-4"><Globe2 size={14} /> STEP 2 · REAL WORLD PROBLEMS</div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-indigo-950 mb-3">
          Best-fit field: <span className="text-indigo-600">{domain || "Exploring..."}</span>
        </h2>
        <p className="text-indigo-900/70 max-w-3xl">{whyFit}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((t, i) => <span key={i} className="chip" data-testid={`tag-${i}`}>#{t}</span>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        {problems.map((p, idx) => (
          <motion.button
            key={p.id || idx}
            onClick={() => onPick(p)}
            whileHover={{ y: -4 }}
            className="glass rounded-3xl p-6 text-left hover:shadow-xl transition-all"
            data-testid={`problem-card-${idx}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-display font-bold text-xl text-indigo-950 leading-snug">{p.title}</h3>
              <span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${sevColor(p.severity)}`}>
                {p.severity}
              </span>
            </div>
            <p className="text-indigo-900/70 text-sm mb-3 leading-relaxed">{p.summary}</p>
            <div className="text-xs text-indigo-700/80 font-semibold">
              Impact · <span className="font-normal text-indigo-900/70">{p.impact}</span>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-indigo-700 font-semibold text-sm">
              Solve this <ArrowRight size={14} />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="bubble-btn bubble-btn-ghost inline-flex items-center gap-2" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-sm text-indigo-900/60">Pick the problem that excites you most</span>
      </div>
    </div>
  );
}
