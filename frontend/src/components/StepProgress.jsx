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
              className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_30px_rgba(99,102,241,0.35)]"
                  : done
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white/60 text-indigo-900 border-white/70"
              }`}
              data-testid={`step-pill-${s.id}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  active ? "bg-white/20" : done ? "bg-emerald-100" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {done ? <Check size={14} /> : s.id}
              </div>
              <span className="hidden sm:inline text-sm font-semibold">{s.label}</span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className="hidden sm:block w-6 h-px bg-indigo-200" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
