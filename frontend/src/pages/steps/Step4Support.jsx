import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Landmark, ExternalLink } from "lucide-react";

const kindColor = (k) => ({
  Government: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Grant: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Accelerator: "bg-rose-50 text-rose-700 border-rose-100",
  Bank: "bg-sky-50 text-sky-700 border-sky-100",
  NGO: "bg-amber-50 text-amber-700 border-amber-100",
}[k] || "bg-indigo-50 text-indigo-700 border-indigo-100");

export default function Step4Support({ domain, resources, loading, onNext, onBack }) {
  const list = resources?.resources || [];

  return (
    <div>
      <div className="mb-6">
        <div className="chip mb-3"><Landmark size={14} /> STEP 4 · FUNDING & SUPPORT</div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-indigo-950 mb-2">
          Grants, govt schemes & backers for <span className="text-indigo-600">{domain}</span>
        </h2>
        <p className="text-indigo-900/70 max-w-3xl">
          Hand-picked starting points. Tap a card to open the official page.
        </p>
      </div>

      {loading && !list.length ? (
        <div className="flex items-center gap-2 text-indigo-700 py-12 justify-center" data-testid="resources-loading">
          <Loader2 className="animate-spin" size={18} /> Finding the best support for you...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((r, i) => (
            <motion.a
              key={i}
              href={r.url || "#"}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -4 }}
              className="glass rounded-3xl p-5 hover:shadow-xl transition-all"
              data-testid={`resource-card-${i}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[11px] font-semibold rounded-full border px-2.5 py-1 ${kindColor(r.kind)}`}>
                  {r.kind}
                </span>
                <ExternalLink size={14} className="text-indigo-600" />
              </div>
              <div className="mt-3 font-display font-bold text-lg text-indigo-950 leading-snug">{r.name}</div>
              <div className="text-xs text-indigo-700/70 mt-1">{r.country}</div>
              <p className="text-sm text-indigo-900/70 mt-3 leading-relaxed">{r.what_it_offers}</p>
              <div className="mt-3 text-xs text-indigo-900/60">
                <span className="font-semibold text-indigo-800">Eligibility · </span>{r.eligibility}
              </div>
              <div className="mt-2 text-xs text-emerald-700">
                <span className="font-semibold">Why it fits · </span>{r.why_relevant}
              </div>
            </motion.a>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="bubble-btn bubble-btn-ghost inline-flex items-center gap-2" data-testid="back-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="bubble-btn bubble-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          data-testid="generate-verdict-btn"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {loading ? "Building verdict..." : "Generate final verdict"}
        </button>
      </div>
    </div>
  );
}
