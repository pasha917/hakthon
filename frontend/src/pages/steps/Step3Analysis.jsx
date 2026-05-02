import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lightbulb, Loader2, Target, GraduationCap, AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import RevealText from "@/components/RevealText";

export default function Step3Analysis({ selected, analysis, refinedIdea, loading, onSubmit, onBack }) {
  const [idea, setIdea] = useState(refinedIdea || "");

  if (!analysis) {
    return (
      <div>
        <div className="mb-7">
          <div className="chip mb-4"><Lightbulb size={12} /> Step 03 · Your solution</div>
          <RevealText text="How would you solve it?" className="font-display font-bold text-4xl sm:text-5xl text-white mb-3" />
          <p className="t-soft">Selected problem:</p>
          <div className="glass p-5 mt-3" data-testid="selected-problem-box">
            <div className="font-display font-semibold text-xl text-white">{selected?.title}</div>
            <div className="text-sm t-soft mt-1">{selected?.summary}</div>
          </div>
        </div>

        <div className="field p-5">
          <textarea
            data-testid="refined-idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your startup idea to tackle this problem. Be specific: who, how, and what's the twist?"
            className="w-full min-h-[170px] bg-transparent outline-none resize-none text-base leading-relaxed"
          />
        </div>

        <div className="mt-7 flex items-center justify-between flex-wrap gap-3">
          <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => onSubmit(idea)}
            disabled={loading || !idea.trim()}
            className="lux-btn lux-btn-primary"
            data-testid="analyze-solution-btn"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
            <span className="relative z-10">{loading ? "Analyzing…" : "Analyze my solution"}</span>
            {!loading && <ArrowRight size={18} className="relative z-10" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="chip mb-4"><Sparkles size={12} /> Step 03 · Deep analysis</div>
        <RevealText text="Your one-liner" className="font-display font-bold text-3xl sm:text-4xl text-white mb-3" />
        <p className="text-2xl text-amber-100/90 italic font-display" data-testid="pitch-line">
          “{analysis.one_line_pitch}”
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <ScoreCard label="Novelty Score" value={analysis.novelty_score} accent="#E6C870" />
        <ScoreCard label="Market-Fit Score" value={analysis.market_fit_score} accent="#34D399" />
      </div>

      <Section icon={<Target size={18} />} title="Existing players & the gap">
        <div className="grid md:grid-cols-2 gap-4">
          {(analysis.existing_players || []).map((p, i) => (
            <a key={i} href={p.url || "#"} target="_blank" rel="noreferrer"
              className="glass p-5 lift block"
              data-testid={`competitor-${i}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-display font-semibold text-white">{p.name}</div>
                <ExternalLink size={14} className="text-amber-200" />
              </div>
              <div className="text-xs t-mute mt-1">How: {p.how_they_do_it}</div>
              <div className="text-sm text-emerald-300 mt-2 font-medium">Gap: {p.gap_you_can_exploit}</div>
            </a>
          ))}
        </div>
      </Section>

      <Section icon={<Sparkles size={18} />} title="Unique angles you can take">
        <ul className="grid md:grid-cols-2 gap-2">
          {(analysis.unique_angles || []).map((a, i) => (
            <li key={i} className="glass px-4 py-3 t-soft" data-testid={`angle-${i}`}>{a}</li>
          ))}
        </ul>
      </Section>

      <Section icon={<GraduationCap size={18} />} title="What to learn">
        <div className="grid md:grid-cols-2 gap-4">
          {(analysis.what_to_learn || []).map((l, i) => (
            <div key={i} className="glass p-5" data-testid={`learn-${i}`}>
              <div className="font-display font-semibold text-white">{l.skill}</div>
              <div className="text-sm t-soft mt-1">{l.why}</div>
              <div className="text-xs text-amber-200 mt-3 font-semibold">Resource: {l.resource}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<AlertTriangle size={18} />} title="Keep in mind">
        <ul className="space-y-2">
          {(analysis.things_to_keep_in_mind || []).map((t, i) => (
            <li key={i} className="glass px-4 py-3 t-soft border-l-2 border-rose-400/60" data-testid={`caveat-${i}`}>{t}</li>
          ))}
        </ul>
      </Section>

      <Section icon={<ArrowRight size={18} />} title="Next concrete actions">
        <ol className="space-y-2">
          {(analysis.next_actions || []).map((a, i) => (
            <li key={i} className="glass px-4 py-3 t-soft flex gap-3 items-start" data-testid={`action-${i}`}>
              <span className="w-7 h-7 rounded-full bg-amber-300/15 text-amber-200 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => onSubmit(idea || refinedIdea)} className="lux-btn lux-btn-primary" data-testid="continue-to-support-btn">
          <span className="relative z-10">See funding & support</span>
          <ArrowRight size={18} className="relative z-10" />
        </button>
      </div>
    </div>
  );
}

function ScoreCard({ label, value = 0, accent = "#E6C870" }) {
  return (
    <div className="glass sheen p-7 relative" data-testid={`score-${label.replace(/\s/g, "-").toLowerCase()}`}>
      <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">{label}</div>
      <div className="flex items-end gap-2 mt-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="font-display font-bold text-6xl glow-text"
          style={{ color: accent }}
        >
          {value}
        </motion.div>
        <div className="t-mute mb-3 text-sm">/ 100</div>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.3))` }}
        />
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4 text-amber-200">
        <span>{icon}</span>
        <h3 className="font-display font-semibold text-xl text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
