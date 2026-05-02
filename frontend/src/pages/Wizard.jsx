import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import StepProgress from "@/components/StepProgress";
import Step1Idea from "@/pages/steps/Step1Idea";
import Step2Problems from "@/pages/steps/Step2Problems";
import Step3Analysis from "@/pages/steps/Step3Analysis";
import Step4Support from "@/pages/steps/Step4Support";
import Step5Verdict from "@/pages/steps/Step5Verdict";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const pageAnim = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20 },
  transition: { type: "spring", stiffness: 260, damping: 22 },
};

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({
    sessionId: null,
    idea: "",
    domain: "",
    whyFit: "",
    tags: [],
    problems: [],
    selectedProblem: null,
    refinedIdea: "",
    analysis: null,
    resources: null,
    verdict: null,
  });

  useEffect(() => {
    const sid = localStorage.getItem("advisor_session_id");
    if (sid) setState((s) => ({ ...s, sessionId: sid }));
  }, []);

  const go = (n) => setStep(n);

  // Step 1 -> 2
  const submitIdea = async (idea) => {
    if (!idea.trim()) { toast.error("Tell me your idea first"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/analyze-idea`, { idea, session_id: state.sessionId });
      const d = res.data;
      localStorage.setItem("advisor_session_id", d.session_id);
      setState((s) => ({
        ...s, sessionId: d.session_id, idea,
        domain: d.domain, whyFit: d.why_fit, tags: d.tags || [], problems: d.problems || [],
      }));
      go(2);
    } catch (e) { toast.error("Analysis failed. Please retry."); }
    finally { setLoading(false); }
  };

  // Step 2 -> 3
  const pickProblem = (problem) => { setState((s) => ({ ...s, selectedProblem: problem })); go(3); };

  const getSid = () => state.sessionId || localStorage.getItem("advisor_session_id");

  // Step 3 -> 4
  const submitRefinedIdea = async (refined) => {
    if (!refined.trim()) { toast.error("Share your solution idea"); return; }
    const sid = getSid();
    if (!sid) { toast.error("Session missing. Please restart."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/analyze-problem`, {
        session_id: sid,
        selected_problem: state.selectedProblem,
        refined_idea: refined,
      });
      setState((s) => ({ ...s, refinedIdea: refined, analysis: res.data }));
      go(4);
      fetchResources(sid);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Analysis failed.";
      toast.error(typeof msg === "string" ? msg : "Analysis failed.");
    } finally { setLoading(false); }
  };

  const fetchResources = async (sidArg) => {
    const sid = sidArg || getSid();
    if (!sid) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/support-resources`, {
        session_id: sid,
        domain: state.domain,
        country: "India",
      });
      setState((s) => ({ ...s, resources: res.data }));
    } catch (e) { toast.error("Couldn't load resources"); }
    finally { setLoading(false); }
  };

  // Step 4 -> 5
  const generateVerdict = async () => {
    const sid = getSid();
    if (!sid) { toast.error("Session missing. Please restart."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/final-verdict`, { session_id: sid }, { timeout: 120000 });
      setState((s) => ({ ...s, verdict: res.data }));
      go(5);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Verdict failed. Retry.";
      toast.error(typeof detail === "string" ? detail : "Verdict failed. Retry.");
    } finally { setLoading(false); }
  };

  const restart = () => {
    localStorage.removeItem("advisor_session_id");
    setState({
      sessionId: null, idea: "", domain: "", whyFit: "", tags: [], problems: [],
      selectedProblem: null, refinedIdea: "", analysis: null, resources: null, verdict: null,
    });
    go(1);
  };

  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3" data-testid="brand">
          <div className="w-10 h-10 rounded-full" style={{ background: "linear-gradient(135deg,#6366F1,#F43F5E)" }} />
          <div>
            <div className="font-display font-extrabold text-xl text-indigo-950 leading-none">BubblePilot</div>
            <div className="text-xs text-indigo-700/70">AI Startup Advisor</div>
          </div>
        </div>
        {step > 1 && (
          <button onClick={restart} className="bubble-btn bubble-btn-ghost text-sm" data-testid="restart-btn">
            Start over
          </button>
        )}
      </header>

      <StepProgress current={step} />

      <AnimatePresence mode="wait">
        <motion.div key={step} {...pageAnim} data-testid={`step-view-${step}`}>
          {step === 1 && <Step1Idea onSubmit={submitIdea} loading={loading} initial={state.idea} />}
          {step === 2 && (
            <Step2Problems
              domain={state.domain} whyFit={state.whyFit} tags={state.tags}
              problems={state.problems} onPick={pickProblem} onBack={() => go(1)}
            />
          )}
          {step === 3 && (
            <Step3Analysis
              selected={state.selectedProblem}
              analysis={state.analysis}
              refinedIdea={state.refinedIdea}
              loading={loading}
              onSubmit={submitRefinedIdea}
              onBack={() => go(2)}
            />
          )}
          {step === 4 && (
            <Step4Support
              domain={state.domain}
              resources={state.resources}
              loading={loading}
              onNext={generateVerdict}
              onBack={() => go(3)}
            />
          )}
          {step === 5 && (
            <Step5Verdict
              verdict={state.verdict}
              idea={state.idea}
              domain={state.domain}
              onBack={() => go(4)}
              onRestart={restart}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
