import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, X, Loader2, ArrowRight, KeyRound } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth, fmtAuthError } from "@/context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthModal() {
  const { isLoginOpen, closeLogin, login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup | forgot | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setEmail(""); setPassword(""); setName(""); setOtp(""); setNewPassword(""); };
  const close = () => { closeLogin(); reset(); setMode("login"); };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name || u.email}!`);
      close();
    } catch (err) { toast.error(fmtAuthError(err)); }
    finally { setLoading(false); }
  };

  const onSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await signup(email.trim(), password, name.trim());
      toast.success(`Welcome aboard, ${u.name}!`);
      close();
    } catch (err) { toast.error(fmtAuthError(err)); }
    finally { setLoading(false); }
  };

  const onForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: email.trim() });
      toast.success("Reset code sent — check your email inbox");
      setMode("otp");
    } catch (err) { toast.error(fmtAuthError(err)); }
    finally { setLoading(false); }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await axios.post(`${API}/auth/verify-otp`, {
        email: email.trim(), otp: otp.trim(), new_password: newPassword,
      });
      // Auto-login with returned token
      localStorage.setItem("bp_token", r.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${r.data.token}`;
      toast.success("Password updated. You're signed in.");
      window.location.reload();
    } catch (err) { toast.error(fmtAuthError(err)); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {isLoginOpen && (
        <motion.div
          key="auth-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "radial-gradient(70% 50% at 50% 40%, rgba(18,12,30,0.92), rgba(7,7,13,0.96))", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
          data-testid="auth-modal"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="glass-heavy sheen relative w-full max-w-md p-7 md:p-9"
            onClick={(e) => e.stopPropagation()}
            data-testid="auth-modal-card"
          >
            <button onClick={close} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/60" data-testid="auth-close">
              <X size={18} />
            </button>

            <div className="chip mb-4">
              {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Forgot password" : "Reset password"}
            </div>
            <h2 className="font-display font-bold text-3xl text-white mb-2">
              {mode === "login" && "Welcome back"}
              {mode === "signup" && "Join the atelier"}
              {mode === "forgot" && "Reset your access"}
              {mode === "otp" && "Enter the 6-digit code"}
            </h2>
            <p className="t-soft text-sm mb-6">
              {mode === "login" && "Sign in to unlock your dossier."}
              {mode === "signup" && "Founders only. Build, pitch, and ship."}
              {mode === "forgot" && "Enter your email — we'll send a 6-digit OTP that expires in 10 minutes."}
              {mode === "otp" && "Use the code from your inbox to set a new password."}
            </p>

            {mode === "login" && (
              <form onSubmit={onLogin} className="space-y-3" data-testid="auth-form-login">
                <Input icon={<Mail size={16} />} type="email" placeholder="you@startup.com" value={email} onChange={setEmail} testid="auth-email" />
                <Input icon={<Lock size={16} />} type="password" placeholder="Password" value={password} onChange={setPassword} testid="auth-password" />
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-amber-300 hover:text-amber-200" data-testid="auth-forgot-link">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading} className="lux-btn lux-btn-primary w-full mt-2" data-testid="auth-submit">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} className="relative z-10" />}
                  <span className="relative z-10">Sign in</span>
                </button>
                <div className="text-center text-sm t-soft mt-3">
                  New here? <button type="button" onClick={() => setMode("signup")} className="text-amber-300 hover:text-amber-200 font-semibold" data-testid="auth-switch-signup">Create an account</button>
                </div>
              </form>
            )}

            {mode === "signup" && (
              <form onSubmit={onSignup} className="space-y-3" data-testid="auth-form-signup">
                <Input icon={<User size={16} />} type="text" placeholder="Your name" value={name} onChange={setName} testid="auth-name" />
                <Input icon={<Mail size={16} />} type="email" placeholder="you@startup.com" value={email} onChange={setEmail} testid="auth-email" />
                <Input icon={<Lock size={16} />} type="password" placeholder="Password (min 6 chars)" value={password} onChange={setPassword} testid="auth-password" />
                <button type="submit" disabled={loading} className="lux-btn lux-btn-primary w-full mt-2" data-testid="auth-submit">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} className="relative z-10" />}
                  <span className="relative z-10">Create account</span>
                </button>
                <div className="text-center text-sm t-soft mt-3">
                  Already have one? <button type="button" onClick={() => setMode("login")} className="text-amber-300 hover:text-amber-200 font-semibold" data-testid="auth-switch-login">Sign in</button>
                </div>
              </form>
            )}

            {mode === "forgot" && (
              <form onSubmit={onForgot} className="space-y-3" data-testid="auth-form-forgot">
                <Input icon={<Mail size={16} />} type="email" placeholder="you@startup.com" value={email} onChange={setEmail} testid="auth-email" />
                <button type="submit" disabled={loading} className="lux-btn lux-btn-primary w-full mt-2" data-testid="auth-submit">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} className="relative z-10" />}
                  <span className="relative z-10">Send OTP</span>
                </button>
                <div className="text-center text-sm t-soft mt-3">
                  <button type="button" onClick={() => setMode("login")} className="text-amber-300 hover:text-amber-200 font-semibold" data-testid="auth-back-login">Back to sign in</button>
                </div>
              </form>
            )}

            {mode === "otp" && (
              <form onSubmit={onVerifyOtp} className="space-y-3" data-testid="auth-form-otp">
                <Input icon={<Mail size={16} />} type="email" placeholder="Email" value={email} onChange={setEmail} testid="auth-email" />
                <Input icon={<KeyRound size={16} />} type="text" placeholder="6-digit OTP" value={otp} onChange={setOtp} testid="auth-otp" />
                <Input icon={<Lock size={16} />} type="password" placeholder="New password" value={newPassword} onChange={setNewPassword} testid="auth-new-password" />
                <button type="submit" disabled={loading} className="lux-btn lux-btn-primary w-full mt-2" data-testid="auth-submit">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} className="relative z-10" />}
                  <span className="relative z-10">Reset & sign in</span>
                </button>
                <div className="text-center text-sm t-soft mt-3">
                  Code didn't arrive? <button type="button" onClick={() => setMode("forgot")} className="text-amber-300 hover:text-amber-200 font-semibold" data-testid="auth-resend">Resend</button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Input({ icon, type, placeholder, value, onChange, testid }) {
  return (
    <label className="field flex items-center gap-3 px-4 py-3">
      <span className="text-amber-300 shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none flex-1 text-white"
        data-testid={testid}
      />
    </label>
  );
}
