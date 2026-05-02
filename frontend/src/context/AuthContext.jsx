import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "bp_token";

const AuthCtx = createContext({ user: null, ready: false, login: () => {}, signup: () => {}, logout: () => {}, openLogin: () => {}, isLoginOpen: false, closeLogin: () => {} });

export function useAuth() { return useContext(AuthCtx); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);

  const setAuthHeader = useCallback((token) => {
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else delete axios.defaults.headers.common["Authorization"];
  }, []);

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setReady(true); return; }
    setAuthHeader(token);
    axios.get(`${API}/auth/me`, { timeout: 10000 })
      .then((r) => setUser(r.data?.user || null))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setAuthHeader(null); })
      .finally(() => setReady(true));
  }, [setAuthHeader]);

  const login = useCallback(async (email, password) => {
    const r = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setAuthHeader(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }, [setAuthHeader]);

  const signup = useCallback(async (email, password, name) => {
    const r = await axios.post(`${API}/auth/signup`, { email, password, name });
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setAuthHeader(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }, [setAuthHeader]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthHeader(null);
    setUser(null);
  }, [setAuthHeader]);

  const value = {
    user, ready, login, signup, logout,
    openLogin: () => setLoginOpen(true),
    closeLogin: () => setLoginOpen(false),
    isLoginOpen,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function fmtAuthError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}
