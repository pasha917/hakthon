import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lightbulb, Loader2, Target, GraduationCap, AlertTriangle, ExternalLink } from "lucide-react";

export default function Step3Analysis({ selected, analysis, refinedIdea, loading, onSubmit, onBack }) {
  const [idea, setIdea] = useState(refinedIdea || "");

  if (!analysis) {
    return (
      <div>
        <div className="mb-6">
          <div className="chip mb-3"><Lightbulb size={14} /> STEP 3 · YOUR SOLUTION</div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-indigo-950 mb-2">
            How would you solve it?
          </h2>
          <p className="text-indigo-900/70">Selected problem:</p>
          <div className="glass rounded-2xl p-4 mt-2" data-testid="selected-problem-box">
            <div className="font-display font-bold text-indigo-900">{selected?.title}</div>
            <div className="text-sm text-indigo-900/70 mt-1">{selected?.summary}</div>
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <textarea
            data-testid="refined-idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your startup idea to tackle this problem. Be specific: who, how, and what's the twist?"
            className="w-full min-h-[160px] bg-transparent outline-none resize-none text-indigo-950 placeholder:text-indigo-900/40 text-base leading-relaxed"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={onBack} className="bubble-btn bubble-btn-ghost inline-flex items-center gap-2" data-testid="back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => onSubmit(idea)}
            disabled={loading || !idea.trim()}
            className="bubble-btn bubble-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            data-testid="analyze-solution-btn"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
            {loading ? "Analyzing..." : "Analyze my solution"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="chip mb-3"><Lightbulb size={14} /> STEP 3 · DEEP ANALYSIS</div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-indigo-950 mb-2">
          Your one-liner
        </h2>
        <p className="text-xl text-indigo-800 italic" data-testid="pitch-line">“{analysis.one_line_pitch}”</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <ScoreCard label="Novelty Score" value={analysis.novelty_score} />
        <ScoreCard label="Market-Fit Score" value={analysis.market_fit_score} accent="#10B981" />
      </div>

      <Section icon={<Target size={18} />} title="Existing players & the gap">
        <div className="grid md:grid-cols-2 gap-4">
          {(analysis.existing_players || []).map((p, i) => (
            <a key={i} href={p.url || "#"} target="_blank" rel="noreferrer"
              className="glass rounded-2xl p-4 hover:shadow-lg transition-all"
              data-testid={`competitor-${i}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-indigo-900">{p.name}</div>
                <ExternalLink size={14} className="text-indigo-600" />
              </div>
              <div className="text-xs text-indigo-900/60 mt-1">How: {p.how_they_do_it}</div>
              <div className="text-sm text-emerald-700 mt-2 font-medium">Gap: {p.gap_you_can_exploit}</div>
            </a>
          ))}
        </div>
      </Section>

      <Section icon={<motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>✨</motion.span>} title="Unique angles you can take">
        <ul className="grid md:grid-cols-2 gap-2">
          {(analysis.unique_angles || []).map((a, i) => (
            <li key={i} className="glass rounded-2xl px-4 py-3 text-indigo-900" data-testid={`angle-${i}`}>{a}</li>
          ))}
        </ul>
      </Section>

      <Section icon={<GraduationCap size={18} />} title="What to learn">
        <div className="grid md:grid-cols-2 gap-4">
          {(analysis.what_to_learn || []).map((l, i) => (
            <div key={i} className="glass rounded-2xl p-4" data-testid={`learn-${i}`}>
              <div className="font-display font-bold text-indigo-900">{l.skill}</div>
              <div className="text-sm text-indigo-900/70 mt-1">{l.why}</div>
              <div className="text-xs text-indigo-700 mt-2 font-semibold">Resource: {l.resource}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<AlertTriangle size={18} />} title="Keep in mind">
        <ul className="space-y-2">
          {(analysis.things_to_keep_in_mind || []).map((t, i) => (
            <li key={i} className="glass rounded-2xl px-4 py-3 text-indigo-900 border-l-4 border-rose-300" data-testid={`caveat-${i}`}>{t}</li>
          ))}
        </ul>
      </Section>

      <Section icon={<ArrowRight size={18} />} title="Next concrete actions">
        <ol className="space-y-2">
          {(analysis.next_actions || []).map((a, i) => (
            <li key={i} className="glass rounded-2xl px-4 py-3 text-indigo-900 flex gap-3" data-testid={`action-${i}`}>
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="bubble-btn bubble-btn-ghost inline-flex items-center gap-2" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => onSubmit(idea || refinedIdea)} className="bubble-btn bubble-btn-primary inline-flex items-center gap-2" data-testid="continue-to-support-btn">
          See funding & support <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

function ScoreCard({ label, value = 0, accent = "#6366F1" }) {
  return (
    <div className="glass rounded-3xl p-6" data-testid={`score-${label.replace(/\s/g, "-").toLowerCase()}`}>
      <div className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">{label}</div>
      <div className="flex items-end gap-2 mt-2">
        <div className="font-display font-extrabold text-5xl" style={{ color: accent }}>{value}</div>
        <div className="text-indigo-900/60 mb-2">/ 100</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-indigo-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: accent }}
        />
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3 text-indigo-900">
        <span className="text-indigo-600">{icon}</span>
        <h3 className="font-display font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}
