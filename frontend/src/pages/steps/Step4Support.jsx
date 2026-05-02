import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Landmark, ExternalLink } from "lucide-react";
import RevealText from "@/components/RevealText";

const kindColor = (k) => ({
  Government: "border-amber-300/40 text-amber-200 bg-amber-300/10",
  Grant: "border-emerald-400/40 text-emerald-200 bg-emerald-400/10",
  Accelerator: "border-rose-400/40 text-rose-200 bg-rose-400/10",
  Bank: "border-sky-400/40 text-sky-200 bg-sky-400/10",
  NGO: "border-violet-400/40 text-violet-200 bg-violet-400/10",
}[k] || "border-white/10 text-white/70 bg-white/5");

export default function Step4Support({ domain, resources, loading, onNext, onBack }) {
  const list = resources?.resources || [];

  return (
    <div>
      <div className="mb-9">
        <div className="chip mb-4"><Landmark size={12} /> Step 04 · Funding & support</div>
        <RevealText
          text={`Grants & backers for ${domain}`}
          className="font-display font-bold text-3xl sm:text-5xl text-white mb-3"
        />
        <p className="t-soft max-w-3xl">Hand-picked starting points. Tap any card to open the official portal.</p>
      </div>

      {loading && !list.length ? (
        <div className="flex items-center gap-2 text-amber-200 py-16 justify-center" data-testid="resources-loading">
          <Loader2 className="animate-spin" size={18} /> Curating the best support for you…
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((r, i) => (
            <motion.a
              key={i}
              href={r.url || "#"}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -6 }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass sheen lift p-6 block"
              data-testid={`resource-card-${i}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] tracking-widest uppercase font-bold rounded-full border px-2.5 py-1 ${kindColor(r.kind)}`}>
                  {r.kind}
                </span>
                <ExternalLink size={14} className="text-amber-200" />
              </div>
              <div className="mt-4 font-display font-semibold text-xl text-white leading-snug">{r.name}</div>
              <div className="text-xs t-mute mt-1">{r.country}</div>
              <p className="text-sm t-soft mt-3 leading-relaxed">{r.what_it_offers}</p>
              <div className="mt-3 text-xs t-mute">
                <span className="font-semibold text-amber-200/80">Eligibility · </span>{r.eligibility}
              </div>
              <div className="mt-2 text-xs text-emerald-300/90">
                <span className="font-semibold">Why it fits · </span>{r.why_relevant}
              </div>
            </motion.a>
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="lux-btn lux-btn-ghost" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="lux-btn lux-btn-primary"
          data-testid="generate-verdict-btn"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} className="relative z-10" />}
          <span className="relative z-10">{loading ? "Building verdict…" : "Generate final verdict"}</span>
        </button>
      </div>
    </div>
  );
}
