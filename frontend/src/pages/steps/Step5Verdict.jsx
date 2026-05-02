import React from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line,
} from "recharts";
import { Trophy, Rocket, ArrowLeft, RefreshCw, Download } from "lucide-react";

const COLORS = ["#6366F1", "#F43F5E", "#10B981", "#F59E0B", "#0EA5E9"];

const usd = (n) => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
};

export default function Step5Verdict({ verdict, idea, domain, onBack, onRestart }) {
  if (!verdict) {
    return (
      <div className="text-center py-16 text-indigo-700" data-testid="verdict-empty">
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
    { name: "Score", value: viability_score, fill: "#6366F1" },
    { name: "Gap", value: Math.max(0, 100 - viability_score), fill: "#E0E7FF" },
  ];

  const print = () => window.print();

  return (
    <div>
      <div className="mb-8">
        <div className="chip mb-3"><Trophy size={14} /> STEP 5 · FINAL VERDICT</div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-indigo-950 mb-3">
          The bubble report for <span className="text-indigo-600">{domain}</span>
        </h2>
        <p className="text-indigo-900/80 max-w-3xl leading-relaxed" data-testid="verdict-summary">{verdict_summary}</p>
      </div>

      {/* Big scores */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-3xl p-6 text-center" data-testid="viability-card">
          <div className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">Viability</div>
          <div className="relative mx-auto w-40 h-40 mt-2">
            <PieChart width={160} height={160}>
              <Pie data={viabilityData} innerRadius={54} outerRadius={72} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                {viabilityData.map((_, i) => <Cell key={i} fill={viabilityData[i].fill} />)}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-extrabold text-4xl text-indigo-700">{viability_score}</div>
              <div className="text-xs text-indigo-900/60">/ 100</div>
            </div>
          </div>
        </motion.div>

        <div className="glass rounded-3xl p-6" data-testid="world-impact-card">
          <div className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">World Impact</div>
          <div className="font-display font-extrabold text-5xl text-rose-500 mt-2">{world_impact_score}</div>
          <div className="mt-3 h-2 rounded-full bg-rose-100 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${world_impact_score}%` }}
              transition={{ duration: 1 }} className="h-full rounded-full bg-rose-500" />
          </div>
          <p className="text-sm text-indigo-900/70 mt-4">How strongly this startup can move the needle on the selected global problem.</p>
        </div>

        <div className="glass rounded-3xl p-6" data-testid="years-card">
          <div className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">Years to Success</div>
          <div className="flex items-end gap-2 mt-2">
            <div className="font-display font-extrabold text-5xl text-emerald-600">{years_to_success.likely}</div>
            <div className="text-indigo-900/60 mb-2">yrs (likely)</div>
          </div>
          <div className="text-sm text-indigo-900/70 mt-2">
            Range: <span className="font-semibold">{years_to_success.min}</span>–<span className="font-semibold">{years_to_success.max}</span> years
          </div>
        </div>
      </div>

      {/* Growth projection */}
      <div className="glass rounded-3xl p-6 mb-8" data-testid="growth-chart-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-indigo-950">5-year growth projection</h3>
          <span className="chip">Users & Revenue</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={growth_projection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
            <XAxis dataKey="year" tickFormatter={(y) => `Y${y}`} stroke="#6B7280" />
            <YAxis yAxisId="l" stroke="#6B7280" />
            <YAxis yAxisId="r" orientation="right" stroke="#6B7280" tickFormatter={usd} />
            <Tooltip />
            <Legend />
            <Area yAxisId="l" type="monotone" dataKey="users" stroke="#6366F1" fill="url(#gUsers)" />
            <Area yAxisId="r" type="monotone" dataKey="revenue_usd" name="revenue" stroke="#10B981" fill="url(#gRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Funding setups */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        {funding_breakdown.map((f, i) => (
          <motion.div key={i} whileHover={{ y: -4 }} className="glass rounded-3xl p-6" data-testid={`funding-card-${i}`}>
            <div className="chip mb-3">{f.setup}</div>
            <div className="font-display font-extrabold text-3xl text-indigo-700">{usd(f.initial_usd)}</div>
            <div className="text-xs text-indigo-900/60">initial capital</div>
            <div className="mt-4 space-y-1 text-sm">
              <Row label="Monthly burn" value={usd(f.monthly_burn_usd)} />
              <Row label="Runway" value={`${f.runway_months} mo`} />
              <Row label="Team" value={`${f.team_size}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Funding bar comparison */}
      <div className="glass rounded-3xl p-6 mb-8" data-testid="funding-chart-card">
        <h3 className="font-display font-bold text-lg text-indigo-950 mb-3">Setup cost comparison</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funding_breakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
            <XAxis dataKey="setup" stroke="#6B7280" />
            <YAxis stroke="#6B7280" tickFormatter={usd} />
            <Tooltip formatter={(v) => usd(v)} />
            <Bar dataKey="initial_usd" radius={[12, 12, 0, 0]}>
              {funding_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost split + risk radar */}
      <div className="grid lg:grid-cols-2 gap-5 mb-8">
        <div className="glass rounded-3xl p-6" data-testid="cost-split-card">
          <h3 className="font-display font-bold text-lg text-indigo-950 mb-3">Where your money goes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={cost_categories} dataKey="pct" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                {cost_categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-3xl p-6" data-testid="risk-radar-card">
          <h3 className="font-display font-bold text-lg text-indigo-950 mb-3">Risk radar</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={risk_radar}>
              <PolarGrid stroke="#C7D2FE" />
              <PolarAngleAxis dataKey="axis" stroke="#4338CA" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar dataKey="score" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.35} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Final advice */}
      <div className="glass-heavy rounded-3xl p-6 md:p-8 mb-10" data-testid="final-advice-card">
        <div className="flex items-center gap-2 mb-2"><Rocket size={18} className="text-rose-500" />
          <h3 className="font-display font-bold text-lg text-indigo-950">Final advice</h3>
        </div>
        <p className="text-indigo-900 leading-relaxed">{final_advice}</p>
        <div className="text-sm text-indigo-900/60 mt-4">
          Original idea: <span className="italic">“{idea}”</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="bubble-btn bubble-btn-ghost inline-flex items-center gap-2" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-3">
          <button onClick={print} className="bubble-btn bubble-btn-ghost inline-flex items-center gap-2" data-testid="export-btn">
            <Download size={16} /> Export / Print
          </button>
          <button onClick={onRestart} className="bubble-btn bubble-btn-primary inline-flex items-center gap-2" data-testid="new-idea-btn">
            <RefreshCw size={16} /> New idea
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-indigo-900">
      <span className="text-indigo-900/60">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
