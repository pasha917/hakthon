import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Seed" },
  { id: 2, label: "Problems" },
  { id: 3, label: "Analyze" },
  { id: 4, label: "Support" },
  { id: 5, label: "Verdict" },
];

export default function StepProgress({ current }) {
  return (
    <div
      className="flex items-center gap-2 md:gap-4 justify-center flex-wrap mb-10"
      data-testid="step-progress"
    >
      {STEPS.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        return (
          <React.Fragment key={s.id}>
            <motion.div
              layout
              className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all relative overflow-hidden ${
                active
                  ? "border-amber-300/50 text-amber-100"
                  : done
                  ? "border-emerald-400/30 text-emerald-300"
                  : "border-white/10 text-white/55"
              }`}
              style={
                active
                  ? { background: "linear-gradient(135deg, rgba(230,200,112,0.18), rgba(139,92,246,0.18))", boxShadow: "0 8px 26px rgba(230,200,112,0.18)" }
                  : { background: "rgba(255,255,255,0.03)" }
              }
              data-testid={`step-pill-${s.id}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  active ? "bg-amber-300/20 text-amber-200" : done ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-white/55"
                }`}
              >
                {done ? <Check size={14} /> : s.id}
              </div>
              <span className="hidden sm:inline text-xs font-semibold tracking-widest uppercase">{s.label}</span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className="hidden sm:block w-6 h-px bg-gradient-to-r from-amber-200/40 to-transparent" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
