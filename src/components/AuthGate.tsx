"use client";

import { useState, useEffect } from "react";

const COOKIE_NAME = "revshield_auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if auth cookie exists
    const hasAuth = document.cookie.split(";").some((c) => c.trim().startsWith(COOKIE_NAME + "="));
    if (hasAuth) {
      setAuthed(true);
    } else {
      // Check for ?pw= query param
      const params = new URLSearchParams(window.location.search);
      const pw = params.get("pw");
      if (pw) {
        handleLogin(pw);
      } else {
        setAuthed(false);
      }
    }
  }, []);

  async function handleLogin(pw: string) {
    setLoading(true);
    setError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      setAuthed(true);
      // Remove ?pw= from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("pw");
      window.history.replaceState({}, "", url.pathname);
    } else {
      setError(true);
      setAuthed(false);
    }
    setLoading(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(password);
  };

  // Still checking
  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Authenticated
  if (authed) return <>{children}</>;

  // Login form
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            RevShield
          </h1>
          <p className="text-sm text-slate-500 mt-1">Self-Healing Funnel AI</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">&#x1F512;</span>
            <p className="text-sm text-slate-400">This site is password protected.</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Enter password"
            autoFocus
            className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-xs mt-2">Incorrect password. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-all text-sm cursor-pointer"
          >
            {loading ? "Verifying..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
