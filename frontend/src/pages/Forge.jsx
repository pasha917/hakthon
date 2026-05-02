import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Wand2, FileText, Layers, Megaphone, Mic, Download, Mail, Scale, Users } from "lucide-react";
import { toast } from "sonner";
import RevealText from "@/components/RevealText";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Forge({ sessionId, brand, domain, onBack, onOpenPitchPractice }) {
  const [tab, setTab] = useState("logo");

  const tabs = [
    { id: "logo", label: "Logo & Brand", icon: <Wand2 size={16} /> },
    { id: "deck", label: "Pitch Deck", icon: <FileText size={16} /> },
    { id: "stack", label: "Tech Stack", icon: <Layers size={16} /> },
    { id: "marketing", label: "Marketing", icon: <Megaphone size={16} /> },
    { id: "emails", label: "Investor Emails", icon: <Mail size={16} /> },
    { id: "legal", label: "Legal Checklist", icon: <Scale size={16} /> },
    { id: "personas", label: "Customer Personas", icon: <Users size={16} /> },
    { id: "pitch", label: "Pitch Practice", icon: <Mic size={16} /> },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="chip mb-4"><Sparkles size={12} /> The Forge · AI Tools</div>
        <RevealText text="Forge your startup arsenal" className="font-display font-bold text-3xl sm:text-5xl text-white mb-3" />
        <p className="t-soft max-w-3xl text-base">
          Logo, pitch deck, lean tech stack, growth plan and a tough VC role-play — generated and tuned to <span className="text-amber-200">{domain || "your idea"}</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8" data-testid="forge-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => t.id === "pitch" ? onOpenPitchPractice?.() : setTab(t.id)}
            className={`lux-btn ${tab === t.id ? "lux-btn-primary" : "lux-btn-ghost"} text-sm py-2 px-4`}
            data-testid={`forge-tab-${t.id}`}
          >
            {t.icon}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {tab === "logo" && <LogoStudio sessionId={sessionId} brand={brand} />}
        {tab === "deck" && <PitchDeck sessionId={sessionId} brand={brand} />}
        {tab === "stack" && <TechStack sessionId={sessionId} />}
        {tab === "marketing" && <MarketingPlan sessionId={sessionId} />}
        {tab === "emails" && <InvestorEmails sessionId={sessionId} />}
        {tab === "legal" && <LegalChecklist sessionId={sessionId} />}
        {tab === "personas" && <Personas sessionId={sessionId} />}
      </div>

      <div className="mt-10 flex">
        <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="forge-back">
          <ArrowLeft size={16} /> Back to verdict
        </button>
      </div>
    </div>
  );
}

/* ---------- LOGO STUDIO ---------- */
function LogoStudio({ sessionId, brand }) {
  const [name, setName] = useState(brand || "BubbleStack");
  const [style, setStyle] = useState("modern, luxurious, minimal, premium");
  const [palette, setPalette] = useState("deep navy, gold, ivory accents");
  const [loading, setLoading] = useState(false);
  const [logos, setLogos] = useState([]);

  const generate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/generate-logo`, {
        session_id: sessionId, brand_name: name, style, palette,
      }, { timeout: 90000 });
      setLogos((l) => [{ ...res.data, ts: Date.now() }, ...l].slice(0, 6));
    } catch (e) {
      toast.error("Logo generation failed");
    } finally { setLoading(false); }
  };

  const download = (img) => {
    const a = document.createElement("a");
    a.href = `data:${img.mime_type};base64,${img.image_b64}`;
    a.download = `${(img.brand_name || "logo").replace(/\s+/g, "_")}.png`;
    a.click();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="glass p-6 lg:col-span-1" data-testid="logo-form">
        <h3 className="font-display font-semibold text-xl text-white mb-4">Brand kit</h3>
        <Field label="Brand name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent outline-none text-white" data-testid="logo-name" />
        </Field>
        <Field label="Style words">
          <input value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-transparent outline-none text-white" data-testid="logo-style" />
        </Field>
        <Field label="Color palette">
          <input value={palette} onChange={(e) => setPalette(e.target.value)} className="w-full bg-transparent outline-none text-white" data-testid="logo-palette" />
        </Field>
        <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary w-full mt-4" data-testid="logo-generate">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
          <span className="relative z-10">{loading ? "Crafting…" : "Generate logo"}</span>
        </button>
      </div>

      <div className="lg:col-span-2 grid sm:grid-cols-2 gap-5" data-testid="logo-gallery">
        {logos.length === 0 && !loading && (
          <div className="glass p-8 text-center sm:col-span-2 t-soft">
            Your generated logos will appear here. Try a few palette variations for a brand mood-board.
          </div>
        )}
        {loading && (
          <div className="glass p-8 flex items-center justify-center sm:col-span-2 text-amber-200">
            <Loader2 className="animate-spin mr-2" /> Designing premium marks…
          </div>
        )}
        {logos.map((img, i) => (
          <motion.div key={img.ts} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass sheen p-4 lift" data-testid={`logo-card-${i}`}>
            <div className="rounded-xl overflow-hidden bg-black/40">
              <img src={`data:${img.mime_type};base64,${img.image_b64}`} alt={img.brand_name} className="w-full h-56 object-contain" />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="font-display text-amber-200">{img.brand_name}</div>
              <button onClick={() => download(img)} className="chip-soft inline-flex items-center gap-1 hover:border-amber-300/40">
                <Download size={12} /> PNG
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute mb-1">{label}</div>
      <div className="field px-3 py-2.5">{children}</div>
    </label>
  );
}

/* ---------- PITCH DECK ---------- */
function PitchDeck({ sessionId, brand }) {
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/pitch-deck`, { session_id: sessionId, brand_name: brand || undefined }, { timeout: 60000 });
      setDeck(res.data);
      setActive(0);
    } catch (e) { toast.error("Deck generation failed"); }
    finally { setLoading(false); }
  };

  const printDeck = () => window.print();

  if (!deck) {
    return (
      <div className="glass p-10 text-center" data-testid="pitch-deck-empty">
        <h3 className="font-display font-semibold text-2xl text-white mb-2">10-slide investor deck, in 20 seconds</h3>
        <p className="t-soft mb-6 max-w-xl mx-auto">
          We'll write the Problem, Solution, Why-Now, Market, Product, Model, Traction, Team and the Ask — all tuned to your idea.
        </p>
        <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary" data-testid="generate-deck">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
          <span className="relative z-10">{loading ? "Drafting…" : "Generate my deck"}</span>
        </button>
      </div>
    );
  }

  const s = deck.slides[active];

  return (
    <div className="grid lg:grid-cols-4 gap-5" data-testid="pitch-deck">
      <div className="lg:col-span-1 glass p-3 max-h-[520px] overflow-y-auto" data-testid="deck-thumbs">
        {deck.slides.map((sl, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`w-full text-left rounded-xl px-3 py-2.5 mb-1.5 border transition-all ${
              active === i ? "border-amber-300/50 bg-amber-300/10 text-amber-100" : "border-white/5 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
            data-testid={`deck-thumb-${i}`}
          >
            <div className="text-[10px] tracking-widest uppercase t-mute">Slide {sl.n}</div>
            <div className="font-display font-semibold text-sm">{sl.title}</div>
          </button>
        ))}
      </div>

      <div className="lg:col-span-3">
        <div className="glass-heavy p-8 md:p-10 min-h-[440px] relative overflow-hidden" data-testid="deck-slide">
          <div className="absolute top-4 right-6 text-[11px] tracking-[0.2em] uppercase t-mute">{deck.brand} · {deck.tagline}</div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-bold t-mute mb-2">Slide {s.n} / {deck.slides.length}</div>
          <h3 className="font-display font-bold text-3xl md:text-4xl text-white mb-6">{s.title}</h3>
          <ul className="space-y-3">
            {(s.bullets || []).map((b, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className="flex gap-3 text-white/90 text-lg leading-relaxed">
                <span className="t-gold mt-2 inline-block w-1.5 h-1.5 rounded-full bg-amber-300" /> {b}
              </motion.li>
            ))}
          </ul>
          {s.speaker_notes && (
            <div className="mt-8 pt-5 border-t border-white/10 text-sm t-soft italic">
              <span className="text-amber-200 font-semibold not-italic mr-2">Speaker note:</span>{s.speaker_notes}
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => setActive((a) => Math.max(0, a - 1))} className="lux-btn lux-btn-ghost text-sm py-2 px-4" data-testid="deck-prev">Prev</button>
            <button onClick={() => setActive((a) => Math.min(deck.slides.length - 1, a + 1))} className="lux-btn lux-btn-ghost text-sm py-2 px-4" data-testid="deck-next">Next</button>
          </div>
          <div className="flex gap-2">
            <button onClick={printDeck} className="lux-btn lux-btn-ghost text-sm py-2 px-4" data-testid="deck-print"><Download size={14} /> Export</button>
            <button onClick={generate} className="lux-btn lux-btn-primary text-sm py-2 px-4" data-testid="deck-regen">
              <Wand2 size={14} /> <span className="relative z-10">Regenerate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- TECH STACK ---------- */
function TechStack({ sessionId }) {
  const [stack, setStack] = useState(null);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/tech-stack`, { session_id: sessionId }, { timeout: 60000 });
      setStack(res.data);
    } catch (e) { toast.error("Stack generation failed"); }
    finally { setLoading(false); }
  };

  if (!stack) {
    return (
      <div className="glass p-10 text-center" data-testid="stack-empty">
        <h3 className="font-display font-semibold text-2xl text-white mb-2">Lean MVP tech stack + costs</h3>
        <p className="t-soft mb-6 max-w-xl mx-auto">A complete blueprint with monthly cost estimates and a 12-week build plan.</p>
        <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary" data-testid="generate-stack">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
          <span className="relative z-10">{loading ? "Designing…" : "Generate stack"}</span>
        </button>
      </div>
    );
  }

  return (
    <div data-testid="stack-view">
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Stat label="Total monthly" value={`$${stack.total_monthly_cost_usd}`} />
        <Stat label="Build time" value={`${stack.build_time_weeks} wks`} />
        <Stat label="Stack items" value={`${stack.stack?.length || 0}`} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {(stack.stack || []).map((s, i) => (
          <div key={i} className="glass p-5" data-testid={`stack-item-${i}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">{s.category}</div>
              <div className="t-gold font-display font-semibold">${s.monthly_cost_usd}/mo</div>
            </div>
            <div className="font-display font-semibold text-xl text-white mt-1">{s.choice}</div>
            <p className="text-sm t-soft mt-1">{s.why}</p>
          </div>
        ))}
      </div>
      <div className="glass p-6 mb-6">
        <h4 className="font-display font-semibold text-xl text-white mb-3">12-week milestones</h4>
        <ol className="space-y-2">
          {(stack.milestones || []).map((m, i) => (
            <li key={i} className="flex gap-3 t-soft" data-testid={`milestone-${i}`}>
              <span className="w-12 shrink-0 chip-soft justify-center">W{m.week}</span>
              <div><span className="text-white font-semibold">{m.goal}</span> — {m.deliverable}</div>
            </li>
          ))}
        </ol>
      </div>
      <div className="glass p-6">
        <h4 className="font-display font-semibold text-xl text-white mb-3">Sharp tips</h4>
        <ul className="space-y-2">
          {(stack.tips || []).map((t, i) => (
            <li key={i} className="t-soft border-l-2 border-amber-300/50 pl-3" data-testid={`tip-${i}`}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <button onClick={generate} className="lux-btn lux-btn-ghost text-sm py-2 px-4" data-testid="stack-regen">
          <Wand2 size={14} /> Regenerate
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="glass p-5">
      <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">{label}</div>
      <div className="font-display font-bold text-3xl text-white mt-1">{value}</div>
    </div>
  );
}

/* ---------- MARKETING PLAN ---------- */
function MarketingPlan({ sessionId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/marketing-plan`, { session_id: sessionId }, { timeout: 60000 });
      setPlan(res.data);
    } catch (e) { toast.error("Marketing plan failed"); }
    finally { setLoading(false); }
  };

  if (!plan) {
    return (
      <div className="glass p-10 text-center" data-testid="mkt-empty">
        <h3 className="font-display font-semibold text-2xl text-white mb-2">30-60-90 day go-to-market</h3>
        <p className="t-soft mb-6 max-w-xl mx-auto">Channels, weekly actions, KPIs, and three viral hooks unique to your idea.</p>
        <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary" data-testid="generate-mkt">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Megaphone size={18} />}
          <span className="relative z-10">{loading ? "Mapping…" : "Generate plan"}</span>
        </button>
      </div>
    );
  }

  return (
    <div data-testid="mkt-view">
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="glass p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">North-star metric</div>
          <div className="font-display font-bold text-xl text-amber-200 mt-1">{plan.north_star_metric}</div></div>
        <div className="glass p-5"><div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Ideal customer</div>
          <div className="t-soft mt-1">{plan.ideal_customer}</div></div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(plan.channels || []).map((c, i) => (
          <div key={i} className="glass p-5" data-testid={`channel-${i}`}>
            <div className="flex items-center justify-between"><div className="font-display font-semibold text-white">{c.channel}</div><span className="chip-soft">{c.priority}</span></div>
            <div className="text-xs t-mute mt-1">Budget · ${c.budget_usd}/mo · KPI · {c.kpi}</div>
            <ul className="mt-2 space-y-1">{(c.weekly_actions || []).map((a, j) => <li key={j} className="text-sm t-soft">• {a}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[["30 days", plan["30_days"]], ["60 days", plan["60_days"]], ["90 days", plan["90_days"]]].map(([k, items], i) => (
          <div key={i} className="glass p-5">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-gold mb-2">{k}</div>
            <ol className="space-y-1.5 text-sm t-soft">{(items || []).map((a, j) => <li key={j}>{j + 1}. {a}</li>)}</ol>
          </div>
        ))}
      </div>
      <div className="glass p-6">
        <h4 className="font-display font-semibold text-xl text-white mb-3">Viral hooks</h4>
        <ul className="space-y-2">
          {(plan.viral_hooks || []).map((h, i) => (
            <li key={i} className="t-soft border-l-2 border-rose-300/50 pl-3" data-testid={`hook-${i}`}>{h}</li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <button onClick={generate} className="lux-btn lux-btn-ghost text-sm py-2 px-4" data-testid="mkt-regen">
          <Wand2 size={14} /> Regenerate
        </button>
      </div>
    </div>
  );
}

/* ---------- INVESTOR EMAILS ---------- */
function InvestorEmails({ sessionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [investorName, setInvestorName] = useState("Investor");
  const [fundName, setFundName] = useState("Sequoia");

  const generate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/investor-emails`, { session_id: sessionId, investor_name: investorName, fund_name: fundName }, { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error("Email drafting failed"); }
    finally { setLoading(false); }
  };
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch (_) {} };

  return (
    <div data-testid="emails-view">
      <div className="glass p-5 mb-5 grid sm:grid-cols-3 gap-3">
        <Field label="Investor name"><input value={investorName} onChange={(e) => setInvestorName(e.target.value)} className="w-full bg-transparent outline-none text-white" data-testid="email-investor" /></Field>
        <Field label="Fund / firm"><input value={fundName} onChange={(e) => setFundName(e.target.value)} className="w-full bg-transparent outline-none text-white" data-testid="email-fund" /></Field>
        <div className="flex items-end">
          <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary w-full" data-testid="generate-emails">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
            <span className="relative z-10">{loading ? "Drafting…" : "Draft 3 emails"}</span>
          </button>
        </div>
      </div>
      {!data && !loading && <div className="glass p-8 t-soft text-center">3 cold-email angles will appear here — direct, warm-intro ask, and curiosity hook.</div>}
      <div className="grid lg:grid-cols-3 gap-5">
        {(data?.emails || []).map((e, i) => (
          <div key={i} className="glass sheen p-5" data-testid={`email-${i}`}>
            <div className="chip mb-3">{e.angle}</div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Subject</div>
            <div className="font-display font-semibold text-white mb-3">{e.subject}</div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Body</div>
            <pre className="whitespace-pre-wrap text-sm t-soft leading-relaxed mt-1">{e.body}</pre>
            <button onClick={() => copy(`Subject: ${e.subject}\n\n${e.body}`)} className="chip-soft mt-4 hover:border-amber-300/40">Copy</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- LEGAL CHECKLIST ---------- */
function LegalChecklist({ sessionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("India");

  const generate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/legal-checklist`, { session_id: sessionId, country }, { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error("Legal checklist failed"); }
    finally { setLoading(false); }
  };

  const Section = ({ title, items }) => (
    <div className="glass p-5 mb-4">
      <h4 className="font-display font-semibold text-xl text-white mb-3">{title}</h4>
      <ul className="space-y-2">
        {(items || []).map((it, i) => (
          <li key={i} className="border-l-2 border-amber-300/40 pl-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{it.item}</span>
              <span className={`chip-soft ${it.priority === "Critical" ? "text-rose-300 border-rose-400/40" : it.priority === "High" ? "text-amber-200" : "text-white/60"}`}>{it.priority}</span>
            </div>
            <div className="text-sm t-soft">{it.why}</div>
            {it.link && <a href={it.link} target="_blank" rel="noreferrer" className="text-xs text-amber-300 hover:text-amber-200">Open portal →</a>}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div data-testid="legal-view">
      <div className="glass p-5 mb-5 grid sm:grid-cols-3 gap-3">
        <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-transparent outline-none text-white" data-testid="legal-country" /></Field>
        <div className="sm:col-span-2 flex items-end">
          <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary w-full" data-testid="generate-legal">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Scale size={18} />}
            <span className="relative z-10">{loading ? "Drafting…" : "Generate legal checklist"}</span>
          </button>
        </div>
      </div>
      {!data && !loading && <div className="glass p-8 t-soft text-center">Incorporation, IP, compliance and contracts — country-specific.</div>}
      {data && (
        <>
          <Section title="Incorporation" items={data.incorporation} />
          <Section title="IP Protection" items={data.ip_protection} />
          <Section title="Compliance" items={data.compliance} />
          {data.contracts_needed?.length > 0 && (
            <div className="glass p-5 mb-4">
              <h4 className="font-display font-semibold text-xl text-white mb-3">Contracts to draft</h4>
              <div className="flex flex-wrap gap-2">{data.contracts_needed.map((c, i) => <span key={i} className="chip-soft">{c}</span>)}</div>
            </div>
          )}
          {data.first_3_steps?.length > 0 && (
            <div className="glass-heavy p-5">
              <h4 className="font-display font-semibold text-xl text-white mb-3">First 3 steps this week</h4>
              <ol className="space-y-2">
                {data.first_3_steps.map((s, i) => <li key={i} className="flex gap-3 t-soft"><span className="w-6 h-6 rounded-full bg-amber-300/15 text-amber-200 text-xs flex items-center justify-center font-bold">{i + 1}</span>{s}</li>)}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- CUSTOMER PERSONAS ---------- */
function Personas({ sessionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/personas`, { session_id: sessionId }, { timeout: 60000 });
      setData(res.data);
    } catch (e) { toast.error("Persona generation failed"); }
    finally { setLoading(false); }
  };

  if (!data) {
    return (
      <div className="glass p-10 text-center" data-testid="personas-empty">
        <h3 className="font-display font-semibold text-2xl text-white mb-2">Vivid customer personas</h3>
        <p className="t-soft mb-6 max-w-xl mx-auto">3 culturally-specific people with goals, pains, channels, willingness to pay, and a killer quote.</p>
        <button onClick={generate} disabled={loading} className="lux-btn lux-btn-primary" data-testid="generate-personas">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
          <span className="relative z-10">{loading ? "Sketching…" : "Generate personas"}</span>
        </button>
      </div>
    );
  }
  return (
    <div className="grid md:grid-cols-3 gap-5" data-testid="personas-view">
      {(data.personas || []).map((p, i) => (
        <div key={i} className="glass sheen p-6 lift" data-testid={`persona-${i}`}>
          <div className="chip mb-3">{p.role}</div>
          <div className="font-display font-bold text-2xl text-white">{p.name}</div>
          <div className="text-xs t-mute mt-1">{p.age} · {p.location}</div>
          <p className="t-soft text-sm mt-3 italic">"{p.killer_quote}"</p>
          <p className="t-soft text-sm mt-3">{p.snapshot}</p>
          <div className="mt-4">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Goals</div>
            <ul className="text-sm t-soft mt-1 space-y-0.5">{(p.goals || []).map((g, j) => <li key={j}>• {g}</li>)}</ul>
          </div>
          <div className="mt-3">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Pains</div>
            <ul className="text-sm t-soft mt-1 space-y-0.5">{(p.pains || []).map((g, j) => <li key={j}>• {g}</li>)}</ul>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">Reach via</div>
              <div className="text-sm t-soft">{(p.channels_to_reach || []).join(" · ")}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold t-mute">WTP / mo</div>
              <div className="font-display font-bold text-amber-200 text-xl">${p.willingness_to_pay_usd}</div>
            </div>
          </div>
        </div>
      ))}
      <div className="md:col-span-3 mt-2">
        <button onClick={generate} className="lux-btn lux-btn-ghost text-sm py-2 px-4" data-testid="personas-regen"><Wand2 size={14} /> Regenerate</button>
      </div>
    </div>
  );
}
