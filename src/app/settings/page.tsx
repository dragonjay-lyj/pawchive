"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { setSessionCookie, getSessionCookie, getAppVersion } from "@/lib/api";
import { loadPrefs, savePrefs, DEFAULT_PREFS, type Preferences, type Theme, type Rating } from "@/lib/preferences";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import { isAdmin, refreshAdminStatus, tryAdminLogin, adminLogout, changeAdminPassword } from "@/lib/admin";
import { TranslationHistoryPanel } from "@/app/_components/TranslationHistoryPanel";
import { SiteConfigForm } from "@/app/_components/SiteConfigForm";
import { SupabaseAuthPanel } from "@/app/_components/SupabaseAuthPanel";

// ============================================================
// Settings Page — Fluent Design 2 segmented layout
// With auto-login via proxy iframe
// ============================================================

const THEMES: { id: Theme; name: string; colors: string }[] = [
  { id: "dark", name: "Dark", colors: "from-surface-0 via-surface-2 to-surface-4" },
  { id: "darker", name: "Darker", colors: "from-black via-surface-0 to-black" },
  { id: "midnight", name: "Midnight", colors: "from-indigo-950 via-slate-950 to-violet-950" },
  { id: "custom", name: "Custom", colors: "from-primary/40 via-primary/20 to-transparent" },
];

const ACCENT_PRESETS = ["#D0BCFF", "#FF6FB5", "#4A90D9", "#35C759", "#FF424D", "#F59E0B", "#a78bfa"];
const LANG_NAMES: Record<Locale, string> = { en: "English", zh: "简体中文" };

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const SECTIONS: { id: string; label: string; icon: string }[] = [
    { id: "account", label: t("settings.account"), icon: "🔑" },
    { id: "appearance", label: t("settings.appearance"), icon: "🎨" },
    { id: "content", label: t("settings.content"), icon: "📦" },
    { id: "privacy", label: t("settings.privacy"), icon: "🛡️" },
    { id: "translation", label: t("settings.translation.title"), icon: "🌍" },
    { id: "ai", label: t("settings.ai.title"), icon: "✨" },
    { id: "language", label: t("common.language"), icon: "🌐" },
    { id: "admin", label: t("settings.admin.title"), icon: "🔐" },
    { id: "about", label: t("settings.about"), icon: "ℹ️" },
  ];
  const [cookieInput, setCookieInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [admin, setAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminErr, setAdminErr] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const existing = getSessionCookie();
    if (existing) {
      setCookieInput(existing);
      setHasSession(true);
    }
    setPrefs(loadPrefs());
    setAdmin(isAdmin());
    // Confirm against server (cookie may still be valid across sessions)
    refreshAdminStatus().then(setAdmin);
    getAppVersion().then(setAppVersion).catch(() => setAppVersion(null));

    const onChange = () => setAdmin(isAdmin());
    window.addEventListener("pawchive:admin-change", onChange);
    return () => window.removeEventListener("pawchive:admin-change", onChange);
  }, []);

  const [adminLoading, setAdminLoading] = useState(false);
  const doAdminLogin = async () => {
    setAdminLoading(true);
    setAdminErr(null);
    const ok = await tryAdminLogin(adminUser, adminPass);
    setAdminLoading(false);
    if (ok) {
      setAdminUser(""); setAdminPass("");
    } else {
      setAdminErr(t("settings.admin.wrong"));
    }
  };
  const doAdminLogout = async () => {
    await adminLogout();
  };

  const patchPrefs = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  };

  // Listen for postMessage from proxy iframe (login detected)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "pawchive-login" && e.data?.cookie) {
        // Extract session cookie value from document.cookie string
        const match = e.data.cookie.match(/session=([^;]+)/);
        if (match) {
          const sessionValue = match[1];
          setSessionCookie(sessionValue);
          setCookieInput(sessionValue);
          setHasSession(true);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          setShowLoginModal(false);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSave = () => {
    const trimmed = cookieInput.trim();
    if (trimmed) {
      setSessionCookie(trimmed);
      setHasSession(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleClear = () => {
    setSessionCookie(null);
    setCookieInput("");
    setHasSession(false);
  };

  const openLoginModal = () => {
    setLoginLoading(true);
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen">
      <nav className="mica sticky top-0 z-50 border-b border-white/5">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display text-xl tracking-tight">
                <span className="text-primary">Paw</span>chive
              </span>
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <Link href="/browse" className="rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary">{t("nav.browse")}</Link>
              <Link href="/search" className="rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary">{t("nav.search")}</Link>
              <Link href="/creators" className="rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary">{t("nav.creators")}</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/favorites" className="text-sm text-text-secondary hover:text-text-primary transition-colors">{t("nav.favorites")}</Link>
            <Link href="/settings" className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-text-primary">{t("nav.settings")}</Link>
          </div>
        </div>
      </nav>

      {/* ========== LOGIN MODAL ========== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-strong relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                {loginLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                <span className="text-sm font-medium">
                  {loginLoading ? t("settings.login.loading") : t("settings.login.title")}
                </span>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Iframe */}
            <iframe
              ref={iframeRef}
              src="/api/auth/proxy/account/login"
              className="flex-1 border-0"
              title="Pawchive Login"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => setLoginLoading(false)}
            />

            {/* Help text */}
            <div className="border-t border-white/5 px-4 py-2 text-center text-[11px] text-text-tertiary">
              {t("settings.login.hint")}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[960px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold mb-8">{t("settings.title")}</h1>

        <div className="lg:flex lg:gap-8">
          <nav className="mb-6 lg:mb-0 lg:w-[200px] lg:shrink-0">
            <div className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary lg:w-full"
                >
                  <span>{s.icon}</span>
                  {s.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex-1 space-y-12">
            {/* ========== ACCOUNT ========== */}
            <section id="account">
              <h2 className="mb-4 font-display text-xl">{t("settings.account")}</h2>

              {/* Supabase account */}
              <div className="mb-6">
                <SupabaseAuthPanel />
              </div>

              {/* Session status */}
              <div className={cn("glass rounded-2xl p-5 mb-4", hasSession && "ring-1 ring-green-500/30")}>
                <div className="flex items-center gap-3">
                  <span className={cn("h-2.5 w-2.5 rounded-full", hasSession ? "bg-green-400" : "bg-text-tertiary")} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {hasSession ? t("settings.account.connected") : t("settings.account.notConnected")}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {hasSession ? t("settings.account.enabled") : t("settings.account.enable")}
                    </p>
                  </div>
                  {hasSession && (
                    <button onClick={handleClear} className="text-xs text-error hover:underline">
                      {t("settings.account.disconnect")}
                    </button>
                  )}
                </div>
              </div>

              {/* Auto-login button */}
              {!hasSession && (
                <div className="glass rounded-2xl p-5 mb-4 text-center">
                  <p className="text-sm text-text-secondary mb-4">
                    {t("settings.account.oneClick")}
                  </p>
                  <button
                    onClick={openLoginModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t("settings.account.connectBtn")}
                  </button>
                </div>
              )}

              {/* Manual cookie input (always available as fallback) */}
              <details className="glass rounded-2xl p-5">
                <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
                  {t("settings.account.manualToggle")}
                </summary>
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-text-tertiary">
                    {t("settings.account.manualHint")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cookieInput}
                      onChange={(e) => setCookieInput(e.target.value)}
                      placeholder={t("settings.account.manualPlaceholder")}
                      className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleSave}
                      disabled={!cookieInput.trim()}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saved ? `✓ ${t("common.saved")}` : t("common.save")}
                    </button>
                  </div>
                </div>
              </details>
            </section>

            {/* ========== APPEARANCE ========== */}
            <section id="appearance">
              <h2 className="mb-4 font-display text-xl">{t("settings.appearance")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {THEMES.map((th) => {
                  const active = prefs.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => patchPrefs("theme", th.id)}
                      className={cn(
                        "rounded-2xl border-2 p-4 text-left transition-all",
                        active ? "border-primary bg-surface-1" : "border-white/5 bg-surface-1 hover:border-white/10"
                      )}
                    >
                      <div className={cn("h-16 rounded-xl mb-3 bg-gradient-to-br", th.colors)} />
                      <p className="text-sm font-medium">{th.name}</p>
                      <p className="text-xs text-text-tertiary">
                        {active ? t("settings.appearance.themeCurrent") : t("settings.appearance.themeApply")}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Custom accent color */}
              <div className="glass mt-4 rounded-2xl p-5">
                <label className="block text-sm font-medium mb-1">
                  {t("settings.appearance.custom")}
                </label>
                <p className="text-xs text-text-tertiary mb-3">
                  {t("settings.appearance.customHint")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((c) => {
                    const active = prefs.accentColor?.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => patchPrefs("accentColor", c)}
                        aria-label={`Accent ${c}`}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all",
                          active ? "border-white ring-2 ring-primary/40" : "border-white/20 hover:border-white/40"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    );
                  })}
                  <label className="flex h-8 items-center gap-2 rounded-full border-2 border-white/20 px-2 hover:border-white/40 cursor-pointer">
                    <input
                      type="color"
                      value={prefs.accentColor ?? "#D0BCFF"}
                      onChange={(e) => patchPrefs("accentColor", e.target.value)}
                      className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent"
                    />
                    <span className="text-[11px] text-text-secondary">Pick</span>
                  </label>
                  {prefs.accentColor && (
                    <button
                      type="button"
                      onClick={() => patchPrefs("accentColor", null)}
                      className="text-xs text-text-tertiary hover:text-primary"
                    >
                      {t("settings.appearance.customReset")}
                    </button>
                  )}
                </div>
              </div>

              {/* Font family */}
              <div className="glass mt-4 rounded-2xl p-5">
                <label className="block text-sm font-medium mb-3">{t("settings.appearance.font")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["sans", "serif", "mono"] as const).map((f) => {
                    const active = prefs.fontChoice === f;
                    const sampleClass =
                      f === "sans" ? "font-sans"
                      : f === "serif" ? "font-display"
                      : "font-mono";
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => patchPrefs("fontChoice", f)}
                        className={cn(
                          "rounded-xl border-2 p-3 text-left transition-all",
                          active ? "border-primary bg-surface-1" : "border-white/5 bg-surface-1 hover:border-white/10"
                        )}
                      >
                        <p className={cn("text-lg", sampleClass)}>Aa 你好</p>
                        <p className="mt-1 text-xs text-text-tertiary">{t(`settings.appearance.font.${f}`)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Radius scale */}
              <div className="glass mt-4 rounded-2xl p-5">
                <label className="block text-sm font-medium mb-3">{t("settings.appearance.radius")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["default", "rounded", "sharp"] as const).map((r) => {
                    const active = prefs.radiusScale === r;
                    const previewRadius =
                      r === "sharp" ? "rounded-sm"
                      : r === "rounded" ? "rounded-3xl"
                      : "rounded-xl";
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => patchPrefs("radiusScale", r)}
                        className={cn(
                          "border-2 p-3 text-left transition-all rounded-xl",
                          active ? "border-primary bg-surface-1" : "border-white/5 bg-surface-1 hover:border-white/10"
                        )}
                      >
                        <div className={cn("h-10 w-full bg-primary/20", previewRadius)} />
                        <p className="mt-2 text-xs text-text-tertiary">{t(`settings.appearance.radius.${r}`)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ========== CONTENT ========== */}
            <section id="content">
              <h2 className="mb-4 font-display text-xl">{t("settings.content.title")}</h2>
              <div className="glass rounded-2xl p-5 space-y-4">
                <ToggleRow
                  label={t("settings.content.nsfw")}
                  description={t("settings.content.nsfw.desc")}
                  checked={prefs.nsfw}
                  onChange={(v) => patchPrefs("nsfw", v)}
                />
                <ToggleRow
                  label={t("settings.content.hires")}
                  description={t("settings.content.hires.desc")}
                  checked={prefs.hiResImages}
                  onChange={(v) => patchPrefs("hiResImages", v)}
                />
              </div>
              <div className="glass mt-4 rounded-2xl p-5">
                <label className="block text-sm font-medium mb-3">{t("settings.content.rating")}</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">{t("settings.content.rating.safe")}</span>
                  <input
                    type="range"
                    className="flex-1 accent-primary"
                    min={0}
                    max={2}
                    value={prefs.contentRating}
                    onChange={(e) => patchPrefs("contentRating", Number(e.target.value) as Rating)}
                  />
                  <span className="text-xs text-text-tertiary">R-18</span>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-text-tertiary">
                  <span className={prefs.contentRating === 0 ? "text-primary" : ""}>SFW</span>
                  <span className={prefs.contentRating === 1 ? "text-primary" : ""}>R-15</span>
                  <span className={prefs.contentRating === 2 ? "text-primary" : ""}>R-18</span>
                </div>
              </div>
            </section>

            {/* ========== PRIVACY ========== */}
            <section id="privacy">
              <h2 className="mb-4 font-display text-xl">{t("settings.privacy")}</h2>
              <div className="glass rounded-2xl p-5 space-y-4">
                <ToggleRow
                  label={t("settings.privacy.blur")}
                  description={t("settings.privacy.blur.desc")}
                  checked={prefs.blurThumbnails}
                  onChange={(v) => patchPrefs("blurThumbnails", v)}
                />
                <ToggleRow
                  label={t("settings.privacy.safe")}
                  description={t("settings.privacy.safe.desc")}
                  checked={prefs.safeSearch}
                  onChange={(v) => patchPrefs("safeSearch", v)}
                />
              </div>
            </section>

            {/* ========== TRANSLATION & AI SEARCH (server-side, admin-gated) ========== */}
            <section id="translation">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl">{t("settings.translation.title")}</h2>
                {!admin && (
                  <span className="rounded-full border border-white/10 bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                    🔒 {t("settings.translation.locked")}
                  </span>
                )}
              </div>
              <div className="glass rounded-2xl p-5">
                <SiteConfigForm admin={admin} />
              </div>

              <div className="mt-4">
                <TranslationHistoryPanel />
              </div>
            </section>

            {/* ========== AI content preferences (per-user) ========== */}
            <section id="ai">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl">{t("settings.ai.title")}</h2>
              </div>
              <div className="glass rounded-2xl p-5 space-y-4">
                <ToggleRow
                  label={t("settings.ai.translate")}
                  description={t("settings.ai.translate.desc")}
                  checked={prefs.autoTranslate}
                  onChange={(v) => patchPrefs("autoTranslate", v)}
                />
              </div>
            </section>

            {/* ========== ADMIN ========== */}
            <section id="admin">
              <h2 className="mb-4 font-display text-xl">{t("settings.admin.title")}</h2>
              <p className="mb-3 text-xs text-text-tertiary">{t("settings.admin.desc")}</p>
              <div className={cn("glass rounded-2xl p-5", admin && "ring-1 ring-primary/40")}>
                {admin ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="text-sm font-medium">{t("settings.admin.signedIn")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={doAdminLogout}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
                      >
                        {t("settings.admin.signOut")}
                      </button>
                    </div>
                    <AdminChangePasswordForm />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={adminUser}
                        onChange={(e) => setAdminUser(e.target.value)}
                        placeholder={t("settings.admin.user")}
                        className="rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <input
                        type="password"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && doAdminLogin()}
                        placeholder={t("settings.admin.pass")}
                        className="rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={doAdminLogin}
                        disabled={!adminUser || !adminPass || adminLoading}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-40"
                      >
                        {adminLoading ? t("common.loading") : t("settings.admin.signIn")}
                      </button>
                      {adminErr && <span className="text-xs text-error">{adminErr}</span>}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ========== LANGUAGE ========== */}
            <section id="language">
              <h2 className="mb-4 font-display text-xl">{t("common.language")}</h2>
              <div className="glass rounded-2xl p-5">
                <p className="mb-3 text-xs text-text-tertiary">{t("settings.language.desc")}</p>
                <div className="flex flex-wrap gap-2">
                  {LOCALES.map((l) => {
                    const active = locale === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLocale(l)}
                        className={cn(
                          "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                          active
                            ? "border-transparent bg-primary text-on-primary"
                            : "border-white/10 text-text-secondary hover:bg-surface-2"
                        )}
                      >
                        {LANG_NAMES[l]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ========== ABOUT ========== */}
            <section id="about">
              <h2 className="mb-4 font-display text-xl">{t("settings.about")}</h2>
              <div className="glass rounded-2xl p-5">
                <div className="space-y-2 text-sm">
                  <p className="text-text-secondary">
                    <span className="font-medium text-text-primary">Pawchive</span> — {t("settings.about.tagline")}
                  </p>
                  <p className="text-text-tertiary">{t("settings.about.desc")}</p>
                  <a href="https://pawchive.st" target="_blank" rel="noopener" className="inline-block mt-2 text-primary hover:underline text-xs">
                    {t("settings.about.visit")}
                  </a>
                  <div className="mt-4 flex items-center gap-2 pt-4 border-t border-white/5">
                    <span className="text-xs text-text-tertiary">{t("settings.about.commit")}</span>
                    {appVersion ? (
                      <code className="font-mono text-[11px] rounded-md border border-white/5 bg-surface-2 px-2 py-1 text-text-secondary">
                        {appVersion}
                      </code>
                    ) : (
                      <span className="text-[11px] text-text-tertiary">{t("common.loading")}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Toggle Row
// ============================================================
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-text-tertiary">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="h-5 w-9 rounded-full border border-white/10 bg-surface-3 peer-checked:bg-primary peer-checked:border-primary transition-all after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
      </label>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ============================================================
// Admin change-password form
// ============================================================
function AdminChangePasswordForm() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [curPass, setCurPass] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setCurPass(""); setNewUser(""); setNewPass(""); setConfirmPass("");
    setErr(null); setOk(false);
  };

  const submit = async () => {
    setErr(null); setOk(false);
    if (newPass.length < 4) { setErr(t("settings.admin.passwordShort")); return; }
    if (newPass !== confirmPass) { setErr(t("settings.admin.passwordMismatch")); return; }
    setPending(true);
    const res = await changeAdminPassword(curPass, newPass, newUser || undefined);
    setPending(false);
    if (res.ok) {
      setOk(true);
      setCurPass(""); setNewPass(""); setConfirmPass(""); setNewUser("");
      setTimeout(() => setOk(false), 4000);
    } else {
      if (res.error === "current-password-wrong") setErr(t("settings.admin.currentWrong"));
      else if (res.error === "new-password-too-short") setErr(t("settings.admin.passwordShort"));
      else setErr(t("settings.admin.changeFailed", { error: res.error }));
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-surface-2/40 p-4">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (open) reset(); }}
        className="flex w-full items-center justify-between text-sm font-medium text-text-primary"
      >
        <span>🔑 {t("settings.admin.change")}</span>
        <span className={cn("text-text-tertiary transition-transform", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2.5">
          <input
            type="password"
            value={curPass}
            onChange={(e) => setCurPass(e.target.value)}
            placeholder={t("settings.admin.currentPass")}
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <input
            type="text"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder={t("settings.admin.newUser")}
            autoComplete="username"
            className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder={t("settings.admin.newPass")}
              autoComplete="new-password"
              className="rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={t("settings.admin.newPassConfirm")}
              autoComplete="new-password"
              className="rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!curPass || !newPass || !confirmPass || pending}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-40"
            >
              {pending ? t("common.loading") : t("settings.admin.submitChange")}
            </button>
            {err && <span className="text-xs text-error">{err}</span>}
            {ok && <span className="text-xs text-primary">{t("settings.admin.changed")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
