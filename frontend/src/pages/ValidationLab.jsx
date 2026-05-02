import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Sparkles, Trophy, Globe2, Swords, ClipboardList,
  LayoutTemplate, Wallet, Tag, ListChecks, ShieldAlert, Handshake, Wand2,
  Microscope, Compass, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, CartesianGrid, ScatterChart, Scatter, ZAxis, LineChart, Line,
} from "recharts";
import RevealText from "@/components/RevealText";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLORS = ["#E6C870", "#8B5CF6", "#FB7185", "#34D399", "#38BDF8", "#F59E0B"];

const usd = (n) => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
};

const tooltipStyle = {
  contentStyle: { background: "rgba(15,15,22,0.95)", border: "1px solid rgba(230,200,112,0.25)", borderRadius: 12, color: "#F4EFE2" },
  itemStyle: { color: "#F4EFE2" },
  labelStyle: { color: "#E6C870" },
};

const TABS = [
  { id: "scorecard", label: "Scorecard", icon: <Trophy size={16} /> },
  { id: "quality", label: "Idea Quality", icon: <Microscope size={16} /> },
  { id: "swot", label: "SWOT", icon: <Compass size={16} /> },
  { id: "trends", label: "Trends", icon: <TrendingUp size={16} /> },
  { id: "market", label: "Market Sizing", icon: <Globe2 size={16} /> },
  { id: "competitors", label: "Competitor Matrix", icon: <Swords size={16} /> },
  { id: "survey", label: "Customer Survey", icon: <ClipboardList size={16} /> },
  { id: "landing", label: "Landing Copy", icon: <LayoutTemplate size={16} /> },
  { id: "financials", label: "5-yr Financials", icon: <Wallet size={16} /> },
  { id: "pricing", label: "Pricing", icon: <Tag size={16} /> },
  { id: "features", label: "MVP Priorities", icon: <ListChecks size={16} /> },
  { id: "risks", label: "Risk Heat-Map", icon: <ShieldAlert size={16} /> },
  { id: "investors", label: "Investor Match", icon: <Handshake size={16} /> },
];

export default function ValidationLab({ sessionId, domain, onBack }) {
  const [tab, setTab] = useState("scorecard");
  return (
    <div>
      <div className="mb-8">
        <div className="chip mb-4"><Sparkles size={12} /> Validation Lab · 10 AI experts</div>
        <RevealText text="Validate before you build" className="font-display font-bold text-3xl sm:text-5xl text-white mb-3" />
        <p className="t-soft max-w-3xl text-base">
          Data-driven scoring across market, finance, competition, risk and customer signal — tuned to <span className="text-amber-200">{domain || "your idea"}</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8" data-testid="lab-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`lux-btn ${tab === t.id ? "lux-btn-primary" : "lux-btn-ghost"} text-sm py-2 px-4`}
            data-testid={`lab-tab-${t.id}`}
          >
            {t.icon}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {tab === "scorecard" && <Scorecard sessionId={sessionId} />}
        {tab === "quality" && <IdeaQuality sessionId={sessionId} />}
        {tab === "swot" && <SWOT sessionId={sessionId} />}
        {tab === "trends" && <Trends sessionId={sessionId} />}
        {tab === "market" && <MarketSizing sessionId={sessionId} />}
        {tab === "competitors" && <CompetitorMatrix sessionId={sessionId} />}
        {tab === "survey" && <Survey sessionId={sessionId} />}
        {tab === "landing" && <LandingCopy sessionId={sessionId} />}
        {tab === "financials" && <Financials sessionId={sessionId} />}
        {tab === "pricing" && <Pricing sessionId={sessionId} />}
        {tab === "features" && <FeaturePriority sessionId={sessionId} />}
        {tab === "risks" && <RiskMap sessionId={sessionId} />}
        {tab === "investors" && <Investors sessionId={sessionId} />}
      </div>

      <div className="mt-10 flex">
        <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="lab-back">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    </div>
  );
}

/* ---------- generic helpers ---------- */
function useAITool(endpoint, sessionId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const run = async (extra) => {
    // Ignore React synthetic event accidentally passed as arg
    const safeExtra = (extra && typeof extra === "object" && !extra.nativeEvent && !extra._reactName) ? extra : {};
    setLoading(true);
    setError(null);
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await axios.post(
          `${API}${endpoint}`,
          { session_id: sessionId, ...safeExtra },
          { timeout: 90000 }
        );
        setData(res.data);
        setLoading(false);
        return;
      } catch (e) {
        lastErr = e;
        const status = e?.response?.status;
        if (status && status < 500 && status !== 408) break;
      }
    }
    const detail = lastErr?.response?.data?.detail || lastErr?.message || "Unknown error";
    const msg = typeof detail === "string" ? detail : "AI generation failed";
    setError(msg);
    toast.error(msg.slice(0, 140));
    setLoading(false);
  };
  return { data, loading, error, run };
}

function ToolHeader({ title, subtitle, onRun, loading, icon, ready, error }) {
  return (
    <div className="glass p-6 mb-6 flex items-center justify-between flex-wrap gap-3" data-testid="tool-header">
      <div>
        <div className="font-display font-semibold text-2xl text-white flex items-center gap-2">{icon}{title}</div>
        <p className="t-soft text-sm mt-1 max-w-xl">{subtitle}</p>
        {error && <div className="text-rose-300 text-sm mt-2">⚠ {error.slice(0, 200)} — tap Retry.</div>}
      </div>
      <button onClick={onRun} disabled={loading} className="lux-btn lux-btn-primary" data-testid="tool-run">
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
        <span className="relative z-10">{loading ? "Analyzing…" : error ? "Retry" : ready ? "Regenerate" : "Run analysis"}</span>
      </button>
    </div>
  );
}

/* ---------- 1. SCORECARD ---------- */
function Scorecard({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/scorecard", sessionId);
  const tierColor = {
    Diamond: "text-cyan-300", Gold: "text-amber-300", Silver: "text-slate-300",
    Bronze: "text-orange-300", "Re-validate": "text-rose-300",
  }[data?.tier] || "text-amber-300";
  const goColor = data?.go_no_go === "GO" ? "from-emerald-300 via-emerald-400 to-teal-500"
    : data?.go_no_go === "PIVOT" ? "from-amber-300 via-amber-400 to-orange-500"
    : "from-rose-300 via-rose-500 to-rose-700";
  return (
    <div data-testid="scorecard-view">
      <ToolHeader title="Validation Scorecard" subtitle="100-point master scorecard tying every signal together — strengths, gaps, and the go/no-go call." onRun={run} loading={loading} icon={<Trophy size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to score your idea across 8 categories.</div>}
      {data && (
        <>
          <div className="grid lg:grid-cols-3 gap-5 mb-6">
            <div className="glass-heavy p-7 text-center" data-testid="score-final">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Final score</div>
              <div className="font-display font-bold text-7xl text-amber-200 glow-text mt-2">{data.final_score}</div>
              <div className={`mt-2 font-display font-semibold text-xl ${tierColor}`}>{data.tier} tier</div>
              <div className={`mt-3 inline-block px-4 py-1.5 rounded-full text-white font-bold tracking-widest uppercase text-sm bg-gradient-to-r ${goColor}`}>{data.go_no_go}</div>
            </div>
            <div className="glass p-6 lg:col-span-2">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Headline</div>
              <div className="font-display font-semibold text-2xl text-white mt-2 italic">"{data.headline}"</div>
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-emerald-300 mb-1">Top 3 strengths</div>
                  <ul className="text-sm t-soft space-y-1">{(data.top_3_strengths || []).map((x, i) => <li key={i}>+ {x}</li>)}</ul>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-rose-300 mb-1">Top 3 gaps</div>
                  <ul className="text-sm t-soft space-y-1">{(data.top_3_gaps || []).map((x, i) => <li key={i}>− {x}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
          <div className="glass p-6 mb-6">
            <h4 className="font-display font-semibold text-xl text-white mb-3">Category breakdown</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.categories || []}>
                <PolarGrid stroke="rgba(230,200,112,0.25)" />
                <PolarAngleAxis dataKey="name" stroke="#E6C870" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar dataKey="score" stroke="#E6C870" fill="#E6C870" fillOpacity={0.35} />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {(data.categories || []).map((c, i) => (
                <div key={i} className="glass p-3" data-testid={`category-${i}`}>
                  <div className="flex items-center justify-between"><span className="text-sm text-white font-semibold">{c.name}</span><span className="t-gold font-display font-bold">{c.score}</span></div>
                  <div className="text-xs t-mute mt-1">{c.insight}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-heavy p-6">
            <h4 className="font-display font-semibold text-xl text-white mb-3">Next 14 days · 3 actions</h4>
            <ol className="space-y-2">{(data.next_3_actions || []).map((a, i) => <li key={i} className="flex gap-3 t-soft"><span className="w-6 h-6 rounded-full bg-amber-300/15 text-amber-200 text-xs flex items-center justify-center font-bold">{i + 1}</span>{a}</li>)}</ol>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 2. MARKET SIZING ---------- */
function MarketSizing({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/market-sizing", sessionId);
  return (
    <div data-testid="market-view">
      <ToolHeader title="Market Sizing — TAM / SAM / SOM" subtitle="Realistic top-down + bottom-up market estimate with assumptions and verifiable data sources." onRun={run} loading={loading} icon={<Globe2 size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to compute your market.</div>}
      {data && (
        <>
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {[["TAM", data.tam], ["SAM", data.sam], ["SOM (Y3)", data.som_year_3]].map(([k, v], i) => (
              <div key={k} className="glass sheen p-6" data-testid={`market-${k.toLowerCase()}`}>
                <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">{k}</div>
                <div className="font-display font-bold text-4xl mt-2" style={{ color: COLORS[i] }}>{usd(v.value_usd)}</div>
                <div className="text-xs t-soft mt-2">{v.basis}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">CAGR</div><div className="font-display font-bold text-3xl text-emerald-300">{data.growth_rate_pct}%</div></div>
            <div className="glass p-5">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-2">Key assumptions</div>
              <ul className="text-sm t-soft space-y-1">{(data.key_assumptions || []).map((a, i) => <li key={i}>• {a}</li>)}</ul>
            </div>
          </div>
          <div className="glass p-5 mt-4">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-2">Cross-check sources</div>
            <div className="flex flex-wrap gap-2">{(data.data_sources || []).map((s, i) => <span key={i} className="chip-soft">{s}</span>)}</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 3. COMPETITOR MATRIX ---------- */
function CompetitorMatrix({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/competitor-matrix", sessionId);
  const renderStars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  return (
    <div data-testid="competitor-view">
      <ToolHeader title="Competitor Benchmark Matrix" subtitle="Score 4 real competitors across 6 axes; see saturation and your edge at a glance." onRun={run} loading={loading} icon={<Swords size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to benchmark the field.</div>}
      {data && (
        <>
          <div className="glass p-5 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Saturation</div>
                <div className="flex items-end gap-2"><div className="font-display font-bold text-4xl text-rose-300">{data.saturation_score}</div><div className="t-mute text-sm mb-2">/ 100</div></div>
              </div>
              <div className="flex-1 max-w-xl">
                <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-1">Verdict</div>
                <div className="t-soft">{data.verdict}</div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto glass p-3 mb-5">
            <table className="min-w-full text-sm" data-testid="competitor-table">
              <thead className="text-amber-200">
                <tr><th className="text-left p-2">Competitor</th>
                  {Object.keys(data.competitors[0]?.scores || {}).map((k) => <th key={k} className="p-2 text-center">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((c, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-2"><a href={c.url || "#"} target="_blank" rel="noreferrer" className="text-white hover:text-amber-200 font-semibold">{c.name}</a><div className="text-xs t-mute">{c.summary}</div></td>
                    {Object.entries(c.scores).map(([k, v]) => <td key={k} className="p-2 text-center text-amber-300">{renderStars(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="glass-heavy p-5">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-emerald-300 mb-2">Your advantage</div>
            <ul className="space-y-1 t-soft">{(data.your_advantage || []).map((a, i) => <li key={i}>+ {a}</li>)}</ul>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 4. SURVEY ---------- */
function Survey({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/survey", sessionId);
  const exportTxt = () => {
    if (!data) return;
    const txt = `${data.title}\n\n${data.intro}\n\n` + (data.questions || []).map(q => `${q.n}. ${q.q}${q.options?.length ? "\n   " + q.options.join(" / ") : ""}`).join("\n\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "validation_survey.txt"; a.click();
  };
  return (
    <div data-testid="survey-view">
      <ToolHeader title="Customer Validation Survey" subtitle="12 Mom-Test questions to test demand with real users — past behavior, not opinions." onRun={run} loading={loading} icon={<ClipboardList size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to draft your survey.</div>}
      {data && (
        <>
          <div className="glass p-5 mb-5">
            <div className="font-display font-semibold text-xl text-white">{data.title}</div>
            <div className="t-soft text-sm mt-1">{data.intro}</div>
            <div className="flex flex-wrap gap-2 mt-3">{(data.distribution_channels || []).map((c, i) => <span key={i} className="chip-soft">{c}</span>)}</div>
          </div>
          <div className="space-y-3 mb-5">
            {(data.questions || []).map((q) => (
              <div key={q.n} className="glass p-4" data-testid={`question-${q.n}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-300/15 text-amber-200 flex items-center justify-center font-bold text-sm shrink-0">{q.n}</div>
                  <div className="flex-1">
                    <div className="text-white">{q.q}</div>
                    <div className="text-xs t-mute mt-1">{q.type.toUpperCase()} · tests: {q.why}</div>
                    {q.options?.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{q.options.map((o, j) => <span key={j} className="chip-soft text-xs">{o}</span>)}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={exportTxt} className="lux-btn lux-btn-ghost" data-testid="survey-export">Export as text</button>
        </>
      )}
    </div>
  );
}

/* ---------- 5. LANDING COPY ---------- */
function LandingCopy({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/landing-copy", sessionId);
  return (
    <div data-testid="landing-view">
      <ToolHeader title="Landing Page Copy + A/B Variants" subtitle="3 hook angles you can ship today to test demand." onRun={run} loading={loading} icon={<LayoutTemplate size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to draft your headlines.</div>}
      {data && (
        <>
          <div className="glass p-4 mb-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-300 mb-1">A/B hypothesis</div><div className="t-soft">{data.ab_test_hypothesis}</div></div>
          <div className="grid lg:grid-cols-3 gap-5">
            {(data.variants || []).map((v, i) => (
              <div key={i} className="glass sheen p-6 lift" data-testid={`variant-${i}`}>
                <div className="chip mb-4">{v.angle}</div>
                <div className="font-display font-bold text-3xl text-white mb-2 leading-tight">{v.headline}</div>
                <div className="t-soft mb-4">{v.subhead}</div>
                <button className="lux-btn lux-btn-primary mb-4 w-full pointer-events-none">{v.primary_cta}</button>
                <div className="text-xs text-emerald-300 italic mb-3">{v.social_proof}</div>
                <ul className="space-y-1 text-sm t-soft">{(v.feature_bullets || []).map((b, j) => <li key={j}>• {b}</li>)}</ul>
                <div className="text-xs t-mute mt-4 italic">"{v.objection_buster}"</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 6. FINANCIALS ---------- */
function Financials({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/financials", sessionId);
  return (
    <div data-testid="financials-view">
      <ToolHeader title="5-Year P&L & Unit Economics" subtitle="Revenue, EBITDA, break-even month, CAC/LTV — realistic for early-stage." onRun={run} loading={loading} icon={<Wallet size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to project the numbers.</div>}
      {data && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mb-5">
            <Stat label="Break-even" value={`Month ${data.break_even_month}`} />
            <Stat label="Cumulative burn" value={usd(data.cumulative_burn_usd)} />
            <Stat label="CAC" value={usd(data.unit_economics?.cac_usd)} />
            <Stat label="LTV" value={usd(data.unit_economics?.ltv_usd)} />
          </div>
          <div className="glass p-5 mb-5">
            <h4 className="font-display font-semibold text-xl text-white mb-3">Revenue & EBITDA (5 yrs)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.years || []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E6C870" stopOpacity={0.55} /><stop offset="100%" stopColor="#E6C870" stopOpacity={0} /></linearGradient>
                  <linearGradient id="eb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34D399" stopOpacity={0.5} /><stop offset="100%" stopColor="#34D399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,239,226,0.06)" />
                <XAxis dataKey="year" tickFormatter={(y) => `Y${y}`} stroke="rgba(244,239,226,0.55)" />
                <YAxis stroke="rgba(244,239,226,0.55)" tickFormatter={usd} />
                <Tooltip {...tooltipStyle} formatter={(v) => usd(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#E6C870" fill="url(#rev)" />
                <Area type="monotone" dataKey="ebitda" stroke="#34D399" fill="url(#eb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto glass p-3">
            <table className="min-w-full text-sm" data-testid="pnl-table">
              <thead className="text-amber-200"><tr>{["Year", "Revenue", "COGS", "Gross", "Opex", "EBITDA", "Users", "ARPU"].map((h) => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
              <tbody>
                {(data.years || []).map((y, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-2 text-amber-300 font-bold">Y{y.year}</td>
                    <td className="p-2">{usd(y.revenue)}</td><td className="p-2">{usd(y.cogs)}</td><td className="p-2">{usd(y.gross_profit)}</td>
                    <td className="p-2">{usd(y.opex)}</td><td className="p-2 text-emerald-300">{usd(y.ebitda)}</td>
                    <td className="p-2">{y.users?.toLocaleString()}</td><td className="p-2">{usd(y.arpu_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 7. PRICING ---------- */
function Pricing({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/pricing", sessionId);
  return (
    <div data-testid="pricing-view">
      <ToolHeader title="Pricing Strategy" subtitle="3-tier structure with anchor pricing and expected paid conversion." onRun={run} loading={loading} icon={<Tag size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to design your pricing.</div>}
      {data && (
        <>
          <div className="glass p-4 mb-5 flex flex-wrap gap-3 items-center">
            <span className="chip">{data.model}</span>
            <span className="chip-soft">Expected paid · {data.expected_paid_conversion_pct}%</span>
            <span className="t-soft text-sm">{data.rationale}</span>
          </div>
          <div className="grid lg:grid-cols-3 gap-5 mb-5">
            {(data.tiers || []).map((t, i) => (
              <div key={i} className={`glass sheen p-7 lift ${i === 1 ? "border-amber-300/40" : ""}`} data-testid={`tier-${i}`}>
                {i === 1 && <div className="chip mb-3">Most popular</div>}
                <div className="font-display font-semibold text-2xl text-white">{t.name}</div>
                <div className="font-display font-bold text-5xl text-amber-200 mt-3">{t.price_usd === 0 ? "Free" : `$${t.price_usd}`}<span className="text-base t-mute font-sans">/mo</span></div>
                <div className="text-sm t-soft mt-1">{t.target}</div>
                <ul className="mt-4 space-y-2 text-sm t-soft">{(t.features || []).map((f, j) => <li key={j}>✓ {f}</li>)}</ul>
                <div className="text-xs t-mute mt-3 italic">{t.limits}</div>
              </div>
            ))}
          </div>
          {data.anchor_competitor_pricing?.length > 0 && (
            <div className="glass p-5">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-3">Anchor pricing in market</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.anchor_competitor_pricing}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,239,226,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(244,239,226,0.55)" />
                  <YAxis stroke="rgba(244,239,226,0.55)" tickFormatter={(v) => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `$${v}`} />
                  <Bar dataKey="price_usd" radius={[10, 10, 0, 0]}>{data.anchor_competitor_pricing.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- 8. FEATURE PRIORITIES (RICE) ---------- */
function FeaturePriority({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/feature-priority", sessionId);
  const catColor = (c) => ({ Must: "text-rose-300 border-rose-400/40", Should: "text-amber-200 border-amber-300/40", Could: "text-sky-300 border-sky-400/40", Wont: "text-white/40 border-white/15" }[c] || "");
  return (
    <div data-testid="features-view">
      <ToolHeader title="MVP Feature Prioritizer (RICE)" subtitle="Reach × Impact × Confidence ÷ Effort — 10 features ranked." onRun={run} loading={loading} icon={<ListChecks size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to score & rank features.</div>}
      {data && (
        <div className="overflow-x-auto glass p-3">
          <table className="min-w-full text-sm" data-testid="rice-table">
            <thead className="text-amber-200"><tr>{["#", "Feature", "Reach", "Impact", "Conf", "Effort", "RICE", "Bucket"].map((h) => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
            <tbody>
              {(data.features || []).map((f, i) => (
                <tr key={i} className="border-t border-white/5" data-testid={`feature-${i}`}>
                  <td className="p-2 t-mute">{i + 1}</td>
                  <td className="p-2"><div className="text-white font-semibold">{f.name}</div><div className="text-xs t-mute">{f.why}</div></td>
                  <td className="p-2">{f.reach}</td><td className="p-2">{f.impact}</td><td className="p-2">{f.confidence}%</td><td className="p-2">{f.effort_weeks}w</td>
                  <td className="p-2 font-display font-bold text-amber-200">{Math.round(f.rice_score * 10) / 10}</td>
                  <td className="p-2"><span className={`chip-soft ${catColor(f.category)}`}>{f.category}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- 9. RISK HEATMAP ---------- */
function RiskMap({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/risk-heatmap", sessionId);
  const fill = (sev) => sev >= 16 ? "#FB7185" : sev >= 9 ? "#F59E0B" : sev >= 4 ? "#FBBF24" : "#34D399";
  return (
    <div data-testid="risks-view">
      <ToolHeader title="Risk Heat-Map" subtitle="Likelihood × impact for 8 specific risks. Tap each for early signals + mitigation." onRun={run} loading={loading} icon={<ShieldAlert size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to map risks.</div>}
      {data && (
        <>
          <div className="glass p-5 mb-5">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
                <CartesianGrid stroke="rgba(244,239,226,0.06)" />
                <XAxis type="number" dataKey="likelihood" name="Likelihood" domain={[0, 6]} stroke="rgba(244,239,226,0.55)" label={{ value: "Likelihood →", position: "insideBottom", offset: -10, fill: "#E6C870" }} />
                <YAxis type="number" dataKey="impact" name="Impact" domain={[0, 6]} stroke="rgba(244,239,226,0.55)" label={{ value: "Impact →", angle: -90, position: "insideLeft", fill: "#E6C870" }} />
                <ZAxis type="number" dataKey="severity" range={[120, 600]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} {...tooltipStyle} />
                <Scatter data={data.risks || []} fill="#E6C870">
                  {(data.risks || []).map((r, i) => <Cell key={i} fill={fill(r.severity)} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {(data.risks || []).map((r, i) => (
              <div key={i} className="glass p-5" data-testid={`risk-${i}`}>
                <div className="flex items-center justify-between"><div className="font-display font-semibold text-white">{r.name}</div><span className="chip-soft" style={{ color: fill(r.severity), borderColor: fill(r.severity) + "55" }}>{r.severity}/25</span></div>
                <div className="text-xs t-mute mt-1">{r.category} · L{r.likelihood} × I{r.impact}</div>
                <div className="text-sm t-soft mt-2"><span className="text-amber-200 font-semibold">Signals: </span>{r.early_signals}</div>
                <div className="text-sm t-soft mt-1"><span className="text-emerald-300 font-semibold">Mitigation: </span>{r.mitigation}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 10. INVESTOR MATCH ---------- */
function Investors({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/investor-match", sessionId);
  return (
    <div data-testid="investors-view">
      <ToolHeader title="Investor Match" subtitle="6 real funds whose thesis matches you — with check size, portfolio examples, and outreach tips." onRun={run} loading={loading} icon={<Handshake size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to find investor fits.</div>}
      {data && (
        <div className="grid md:grid-cols-2 gap-5">
          {(data.investors || []).map((v, i) => (
            <a key={i} href={v.url || "#"} target="_blank" rel="noreferrer" className="glass sheen lift p-6 block" data-testid={`investor-${i}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-bold text-xl text-white">{v.name}</div>
                  <div className="text-xs t-mute mt-1">{v.type} · {v.stage}</div>
                </div>
                <span className="chip">{v.check_size_usd}</span>
              </div>
              <div className="text-sm t-soft mt-3 italic">"{v.thesis}"</div>
              <div className="text-sm t-soft mt-2"><span className="text-emerald-300 font-semibold">Why match: </span>{v.why_match}</div>
              {v.portfolio_examples?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">{v.portfolio_examples.map((p, j) => <span key={j} className="chip-soft text-xs">{p}</span>)}</div>
              )}
              <div className="text-xs text-amber-200 mt-3"><span className="font-semibold">Outreach: </span>{v.outreach_tip}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="glass p-5">
      <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">{label}</div>
      <div className="font-display font-bold text-2xl text-white mt-1">{value}</div>
    </div>
  );
}

/* ---------- 11. IDEA QUALITY INSPECTOR ---------- */
function IdeaQuality({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/idea-quality", sessionId);
  const tone = (s) => s >= 75 ? "text-emerald-300" : s >= 50 ? "text-amber-300" : "text-rose-300";
  return (
    <div data-testid="quality-view">
      <ToolHeader title="Idea Quality Inspector" subtitle="Microscope on your raw idea — clarity, scope, feasibility & originality scores + smell-fix list." onRun={run} loading={loading} icon={<Microscope size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to inspect your idea quality.</div>}
      {data && (
        <>
          <div className="glass-heavy p-7 mb-5 text-center">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Overall</div>
            <div className={`font-display font-bold text-7xl glow-text mt-2 ${tone(data.overall_score)}`}>{data.overall_score}</div>
            <div className="font-display font-semibold text-xl text-amber-200 mt-1 italic">{data.rating}</div>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-5">
            {[["Clarity", data.clarity_score], ["Scope", data.scope_score], ["Feasibility", data.feasibility_score], ["Originality", data.originality_score]].map(([k, v]) => (
              <div key={k} className="glass p-5 text-center" data-testid={`quality-${k.toLowerCase()}`}>
                <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">{k}</div>
                <div className={`font-display font-bold text-3xl mt-1 ${tone(v)}`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="glass-heavy p-5 mb-5">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-300 mb-2">Crisp rewrite</div>
            <div className="font-display italic text-lg text-white">"{data.rewrite}"</div>
          </div>
          {(data.smells || []).length > 0 && (
            <div className="space-y-3 mb-5">
              {data.smells.map((s, i) => (
                <div key={i} className="glass p-4 border-l-2 border-rose-400/60" data-testid={`smell-${i}`}>
                  <div className="font-display font-semibold text-rose-300">{s.issue}</div>
                  <div className="text-xs t-mute mt-1 italic">"{s.quote}"</div>
                  <div className="text-sm t-soft mt-2"><span className="text-emerald-300 font-semibold">Fix: </span>{s.fix}</div>
                </div>
              ))}
            </div>
          )}
          {data.missing_specifics?.length > 0 && (
            <div className="glass p-5 mb-5">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-2">Still unclear</div>
              <ul className="space-y-1 t-soft">{data.missing_specifics.map((m, i) => <li key={i}>? {m}</li>)}</ul>
            </div>
          )}
          {data.encouragement && <div className="glass p-5 t-soft italic text-center">"{data.encouragement}"</div>}
        </>
      )}
    </div>
  );
}

/* ---------- 12. SWOT ---------- */
function SWOT({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/swot", sessionId);
  const Quadrant = ({ title, items, color, testid }) => (
    <div className={`glass p-5 border-l-4 ${color}`} data-testid={testid}>
      <div className="font-display font-semibold text-lg text-white mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm t-soft">{(items || []).map((x, i) => <li key={i}>• {x}</li>)}</ul>
    </div>
  );
  return (
    <div data-testid="swot-view">
      <ToolHeader title="SWOT Analysis" subtitle="Sharp 4-item-per-quadrant SWOT plus 90-day strategic priorities." onRun={run} loading={loading} icon={<Compass size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to map your SWOT.</div>}
      {data && (
        <>
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <Quadrant title="Strengths" items={data.strengths} color="border-emerald-400/60" testid="swot-strengths" />
            <Quadrant title="Weaknesses" items={data.weaknesses} color="border-rose-400/60" testid="swot-weaknesses" />
            <Quadrant title="Opportunities" items={data.opportunities} color="border-amber-300/60" testid="swot-opportunities" />
            <Quadrant title="Threats" items={data.threats} color="border-violet-400/60" testid="swot-threats" />
          </div>
          {data.strategic_priorities?.length > 0 && (
            <div className="glass-heavy p-6">
              <h4 className="font-display font-semibold text-xl text-white mb-3">90-day strategic priorities</h4>
              <ol className="space-y-2">{data.strategic_priorities.map((p, i) => <li key={i} className="flex gap-3 t-soft"><span className="w-6 h-6 rounded-full bg-amber-300/15 text-amber-200 text-xs flex items-center justify-center font-bold">{i + 1}</span>{p}</li>)}</ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- 13. TRENDS ---------- */
function Trends({ sessionId }) {
  const { data, loading, error, run } = useAITool("/validation/trends", sessionId);
  const trajColor = data?.demand_trajectory === "Rising" ? "text-emerald-300" : data?.demand_trajectory === "Declining" ? "text-rose-300" : "text-amber-300";
  return (
    <div data-testid="trends-view">
      <ToolHeader title="Trend & Demand Signal" subtitle="Search keywords, 5-year trend index, social signals, and geographic hotspots." onRun={run} loading={loading} icon={<TrendingUp size={20} className="text-amber-300" />} ready={!!data} error={error} />
      {!data && !loading && <div className="glass p-8 t-soft text-center">Click Run to read the market signals.</div>}
      {data && (
        <>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            <div className="glass p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Trajectory</div><div className={`font-display font-bold text-3xl mt-1 ${trajColor}`}>{data.demand_trajectory}</div></div>
            <div className="glass p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Search intent</div><div className="font-display font-bold text-2xl text-amber-200 mt-1">{data.search_intent}</div></div>
            <div className="glass p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-2">Top keywords</div><div className="flex flex-wrap gap-2">{(data.primary_keywords || []).map((k, i) => <span key={i} className="chip-soft">{k}</span>)}</div></div>
          </div>
          <div className="glass p-5 mb-5">
            <h4 className="font-display font-semibold text-xl text-white mb-3">5-year interest index</h4>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.trend_index_5y || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,239,226,0.06)" />
                <XAxis dataKey="year" stroke="rgba(244,239,226,0.55)" />
                <YAxis stroke="rgba(244,239,226,0.55)" domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="index" stroke="#E6C870" strokeWidth={2.5} dot={{ fill: "#E6C870", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div className="glass p-5">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-2">Rising sub-topics</div>
              <ul className="space-y-1 t-soft">{(data.rising_subtopics || []).map((s, i) => <li key={i}>↗ {s}</li>)}</ul>
            </div>
            <div className="glass p-5">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-2">Geographic hotspots</div>
              <div className="flex flex-wrap gap-2">{(data.geographic_hotspots || []).map((h, i) => <span key={i} className="chip-soft">{h}</span>)}</div>
            </div>
          </div>
          {data.social_signals && (
            <div className="grid md:grid-cols-4 gap-3 mb-5">
              {Object.entries(data.social_signals).map(([k, v], i) => (
                <div key={i} className="glass p-4">
                  <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-gold">{k.replace("_", " / ")}</div>
                  <div className="text-sm t-soft mt-1">{v}</div>
                </div>
              ))}
            </div>
          )}
          {data.recommended_window && (
            <div className="glass-heavy p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-300 mb-2">Why now?</div><div className="t-soft">{data.recommended_window}</div></div>
          )}
        </>
      )}
    </div>
  );
}
