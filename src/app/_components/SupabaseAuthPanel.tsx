"use client";

import { useState } from "react";
import { useAuth } from "@/lib/supabase/auth-provider";
import { setSessionCookie } from "@/lib/api";

export function SupabaseAuthPanel() {
  const { user, loading, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [showSessionSync, setShowSessionSync] = useState(false);
  const [sessionInput, setSessionInput] = useState("");
  const [sessionMsg, setSessionMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setPending(true);
    setMsg(null);

    const result = mode === "login"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);

    setPending(false);
    if (result.error) {
      setMsg({ type: "err", text: result.error });
    } else if (mode === "register") {
      setMsg({ type: "ok", text: "Check your email for a confirmation link." });
    } else {
      setMsg({ type: "ok", text: "Signed in!" });
    }
  };

  const handleSyncSession = async () => {
    const trimmed = sessionInput.trim();
    if (!trimmed) return;
    setSessionMsg("Saving…");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pawchive_session: trimmed }),
      });
      if (res.ok) {
        setSessionCookie(trimmed);
        setSessionMsg("Session synced to cloud ✓");
      } else {
        setSessionMsg("Failed to save.");
      }
    } catch {
      setSessionMsg("Network error.");
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 text-center text-sm text-text-tertiary">
        Loading…
      </div>
    );
  }

  if (user) {
    return (
      <div className="space-y-4">
        {/* Logged in status */}
        <div className="glass rounded-2xl p-5 ring-1 ring-green-500/30">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Signed in as {user.email}</p>
              <p className="text-xs text-text-tertiary">Favorites are synced to the cloud.</p>
            </div>
            <button
              onClick={() => { void signOut(); }}
              className="text-xs text-error hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Pawchive session sync */}
        <div className="glass rounded-2xl p-5">
          <button
            onClick={() => setShowSessionSync(!showSessionSync)}
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            {showSessionSync ? "▾" : "▸"} Sync pawchive.pw session cookie
          </button>
          {showSessionSync && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-text-tertiary">
                Stores your upstream session cookie in Supabase so it syncs across devices.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value)}
                  placeholder="Paste session cookie…"
                  className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                />
                <button
                  onClick={handleSyncSession}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
              {sessionMsg && (
                <p className={`text-xs ${sessionMsg.includes("✓") ? "text-green-400" : "text-error"}`}>
                  {sessionMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-medium mb-4 text-text-primary">Pawchive Account</p>

      {/* Tab switcher */}
      <div className="mica mb-4 inline-flex rounded-lg border border-white/5 p-0.5">
        <button
          onClick={() => { setMode("login"); setMsg(null); }}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
            mode === "login" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Sign in
        </button>
        <button
          onClick={() => { setMode("register"); setMsg(null); }}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
            mode === "register" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      {msg && (
        <p className={`mt-3 text-xs ${msg.type === "ok" ? "text-green-400" : "text-error"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
