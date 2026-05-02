import React from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Trophy, Rocket, ArrowLeft, RefreshCw, Download } from "lucide-react";
import RevealText from "@/components/RevealText";

const COLORS = ["#E6C870", "#8B5CF6", "#FB7185", "#34D399", "#38BDF8"];

const usd = (n) => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
};

const tooltipStyle = {
  contentStyle: {
    background: "rgba(15,15,22,0.95)",
    border: "1px solid rgba(230,200,112,0.25)",
    borderRadius: 12,
    color: "#F4EFE2",
  },
  itemStyle: { color: "#F4EFE2" },
  labelStyle: { color: "#E6C870" },
};

export default function Step5Verdict({ verdict, idea, domain, onBack, onRestart, onForge }) {
  if (!verdict) {
    return (
      <div className="text-center py-20 t-soft" data-testid="verdict-empty">
        Building your final verdict…
      </div>
    );
  }
  const {
    verdict_summary, viability_score = 0, world_impact_score = 0,
    years_to_success = { min: 2, likely: 3, max: 5 },
    growth_projection = [], funding_breakdown = [], cost_categories = [],
    risk_radar = [], final_advice = "",
  } = verdict;

  const viabilityData = [
    { name: "Score", value: viability_score, fill: "#E6C870" },
    { name: "Gap", value: Math.max(0, 100 - viability_score), fill: "rgba(255,255,255,0.06)" },
  ];

  const print = () => window.print();

  return (
    <div>
      <div className="mb-10">
        <div className="chip mb-4"><Trophy size={12} /> Step 05 · The dossier</div>
        <RevealText
          text={`The bubble report for ${domain}`}
          className="font-display font-bold text-3xl sm:text-5xl text-white mb-4"
        />
        <p className="t-soft max-w-3xl text-lg leading-relaxed" data-testid="verdict-summary">{verdict_summary}</p>
      </div>

      {/* Big scores */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass sheen p-7 text-center relative" data-testid="viability-card">
          <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Viability</div>
          <div className="relative mx-auto w-44 h-44 mt-3">
            <PieChart width={176} height={176}>
              <Pie data={viabilityData} innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                {viabilityData.map((_, i) => <Cell key={i} fill={viabilityData[i].fill} />)}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-bold text-5xl text-amber-200 glow-text">{viability_score}</div>
              <div className="text-xs t-mute">/ 100</div>
            </div>
          </div>
        </motion.div>

        <div className="glass p-7" data-testid="world-impact-card">
          <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">World impact</div>
          <div className="font-display font-bold text-6xl text-rose-300 glow-text mt-3">{world_impact_score}</div>
          <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${world_impact_score}%` }}
              transition={{ duration: 1.2 }} className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#FB7185,#E6C870)" }} />
          </div>
          <p className="text-sm t-soft mt-5">How strongly this startup can move the needle on the selected global problem.</p>
        </div>

        <div className="glass p-7" data-testid="years-card">
          <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Years to success</div>
          <div className="flex items-end gap-2 mt-3">
            <div className="font-display font-bold text-6xl text-emerald-300 glow-text">{years_to_success.likely}</div>
            <div className="t-mute mb-3 text-sm">yrs · likely</div>
          </div>
          <div className="text-sm t-soft mt-2">
            Range: <span className="font-semibold text-white">{years_to_success.min}</span>–<span className="font-semibold text-white">{years_to_success.max}</span> years
          </div>
        </div>
      </div>

      {/* Growth projection */}
      <div className="glass sheen p-6 mb-10" data-testid="growth-chart-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-2xl text-white">5-year growth projection</h3>
          <span className="chip-soft">Users & Revenue</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={growth_projection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E6C870" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#E6C870" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,239,226,0.06)" />
            <XAxis dataKey="year" tickFormatter={(y) => `Y${y}`} stroke="rgba(244,239,226,0.55)" />
            <YAxis yAxisId="l" stroke="rgba(244,239,226,0.55)" />
            <YAxis yAxisId="r" orientation="right" stroke="rgba(244,239,226,0.55)" tickFormatter={usd} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ color: "#F4EFE2" }} />
            <Area yAxisId="l" type="monotone" dataKey="users" stroke="#E6C870" fill="url(#gUsers)" />
            <Area yAxisId="r" type="monotone" dataKey="revenue_usd" name="revenue" stroke="#34D399" fill="url(#gRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Funding setups */}
      <div className="grid lg:grid-cols-3 gap-5 mb-10">
        {funding_breakdown.map((f, i) => (
          <motion.div key={i} whileHover={{ y: -4 }} className="glass sheen lift p-7" data-testid={`funding-card-${i}`}>
            <div className="chip mb-3">{f.setup}</div>
            <div className="font-display font-bold text-4xl text-amber-200 glow-text">{usd(f.initial_usd)}</div>
            <div className="text-xs t-mute uppercase tracking-widest mt-1">initial capital</div>
            <div className="mt-5 space-y-2 text-sm">
              <Row label="Monthly burn" value={usd(f.monthly_burn_usd)} />
              <Row label="Runway" value={`${f.runway_months} mo`} />
              <Row label="Team" value={`${f.team_size}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Funding bar comparison */}
      <div className="glass p-6 mb-10" data-testid="funding-chart-card">
        <h3 className="font-display font-semibold text-2xl text-white mb-3">Setup cost comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={funding_breakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,239,226,0.06)" />
            <XAxis dataKey="setup" stroke="rgba(244,239,226,0.55)" />
            <YAxis stroke="rgba(244,239,226,0.55)" tickFormatter={usd} />
            <Tooltip {...tooltipStyle} formatter={(v) => usd(v)} />
            <Bar dataKey="initial_usd" radius={[14, 14, 0, 0]}>
              {funding_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost split + risk radar */}
      <div className="grid lg:grid-cols-2 gap-5 mb-10">
        <div className="glass p-6" data-testid="cost-split-card">
          <h3 className="font-display font-semibold text-2xl text-white mb-3">Where your money goes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={cost_categories} dataKey="pct" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4} stroke="rgba(0,0,0,0.4)">
                {cost_categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ color: "#F4EFE2" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-6" data-testid="risk-radar-card">
          <h3 className="font-display font-semibold text-2xl text-white mb-3">Risk radar</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={risk_radar}>
              <PolarGrid stroke="rgba(230,200,112,0.25)" />
              <PolarAngleAxis dataKey="axis" stroke="#E6C870" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar dataKey="score" stroke="#FB7185" fill="#FB7185" fillOpacity={0.35} />
              <Tooltip {...tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Final advice */}
      <div className="glass-heavy p-7 md:p-9 mb-10" data-testid="final-advice-card">
        <div className="flex items-center gap-2 mb-3">
          <Rocket size={18} className="text-rose-300" />
          <h3 className="font-display font-semibold text-2xl text-white">Final advice</h3>
        </div>
        <p className="t-soft text-lg leading-relaxed">{final_advice}</p>
        <div className="hairline my-5" />
        <div className="text-sm t-mute">
          Original idea: <span className="italic text-white/70">“{idea}”</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-3 flex-wrap">
          <button onClick={print} className="lux-btn lux-btn-ghost" data-testid="export-btn">
            <Download size={16} /> Export
          </button>
          {onForge && (
            <button onClick={onForge} className="lux-btn lux-btn-violet" data-testid="open-forge-btn">
              <Rocket size={16} className="relative z-10" />
              <span className="relative z-10">Open the Forge →</span>
            </button>
          )}
          <button onClick={onRestart} className="lux-btn lux-btn-primary" data-testid="new-idea-btn">
            <RefreshCw size={16} className="relative z-10" />
            <span className="relative z-10">New idea</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="t-mute">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
