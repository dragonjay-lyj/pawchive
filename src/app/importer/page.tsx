"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";

const SERVICES: { key: string; label: string; cookie?: string }[] = [
  { key: "patreon", label: "Patreon", cookie: "session_id" },
  { key: "fanbox", label: "Pixiv Fanbox", cookie: "FANBOXSESSID" },
  { key: "gumroad", label: "Gumroad", cookie: "_gumroad_app_session" },
  { key: "subscribestar", label: "SubscribeStar", cookie: "_personalization_id" },
  { key: "fantia", label: "Fantia", cookie: "_session_id" },
  { key: "boosty", label: "Boosty", cookie: "auth" },
  { key: "afdian", label: "爱发电 / Afdian", cookie: "auth_token" },
  { key: "discord", label: "Discord", cookie: "self-token" },
];

export default function ImporterPage() {
  const { t } = useI18n();
  const [service, setService] = useState("patreon");
  const [sessionKey, setSessionKey] = useState("");
  const [channelIds, setChannelIds] = useState("");
  const [authId, setAuthId] = useState("");
  const [xbc, setXbc] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [saveKey, setSaveKey] = useState(true);
  const [autoImport, setAutoImport] = useState(true);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const currentCookieHint = SERVICES.find((s) => s.key === service)?.cookie;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const body = new URLSearchParams();
      body.set("service", service);
      body.set("session_key", sessionKey.trim());
      if (service === "discord" && channelIds.trim()) body.set("channel_ids", channelIds.trim());
      if (service === "onlyfans") {
        body.set("auth_id", authId.trim());
        body.set("x-bc", xbc.trim());
        body.set("user_agent", userAgent.trim() || navigator.userAgent);
      }
      if (saveKey) body.set("save_session_key", "1");
      if (autoImport) body.set("auto_import", "1");

      const res = await fetch("/api/proxy/v1/importer/submit", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        credentials: "include",
      });

      if (res.ok || res.status === 302) {
        setMsg({ ok: true, text: t("importer.success") });
        setSessionKey("");
        setChannelIds("");
        setAuthId("");
        setXbc("");
      } else {
        const text = await res.text().catch(() => "");
        setMsg({ ok: false, text: text.slice(0, 300) || t("importer.failed") });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || t("importer.failed") });
    } finally {
      setPending(false);
    }
  };

  const isDiscord = service === "discord";
  const isOnlyFans = service === "onlyfans";

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold">{t("importer.title")}</h1>
        <p className="mt-2 mb-6 text-sm text-text-secondary">{t("importer.subtitle")}</p>

        <form onSubmit={submit} className="glass rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Service selector */}
          <label className="block">
            <span className="mb-2 block text-sm font-medium">{t("importer.paysite")}</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {SERVICES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>

          {/* Session key */}
          <label className="block">
            <span className="mb-2 block text-sm font-medium">{t("importer.sessionKey")}</span>
            <input
              type="text"
              required
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={1024}
              placeholder={currentCookieHint ? `cookie: ${currentCookieHint}` : ""}
              className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-text-tertiary">
              <span>{t("importer.sessionKey.hint")}</span>
              <Link href="/importer/tutorial" className="text-primary hover:underline">
                {t("importer.tutorialLink")}
              </Link>
            </div>
          </label>

          {/* Discord-only */}
          {isDiscord && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">{t("importer.channelIds")}</span>
              <input
                type="text"
                value={channelIds}
                onChange={(e) => setChannelIds(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="123456789012345678, 234567890123456789"
                className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <p className="mt-1 text-xs text-text-tertiary">{t("importer.channelIds.hint")}</p>
            </label>
          )}

          {/* OnlyFans-only (kept for completeness even though not in service list yet) */}
          {isOnlyFans && (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">{t("importer.authId")}</span>
                <input
                  type="text"
                  required
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  pattern="[0-9]{3,12}"
                  className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">{t("importer.xbc")}</span>
                <input
                  type="text"
                  required
                  value={xbc}
                  onChange={(e) => setXbc(e.target.value)}
                  pattern="[0-9a-f]{30,50}"
                  className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">{t("importer.userAgent")}</span>
                <input
                  type="text"
                  required
                  minLength={10}
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  placeholder={typeof navigator !== "undefined" ? navigator.userAgent : ""}
                  className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </label>
            </>
          )}

          {/* Checkboxes */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <CheckboxRow
              label={t("importer.saveKey")}
              description={t("importer.saveKey.desc")}
              checked={saveKey}
              onChange={setSaveKey}
            />
            <CheckboxRow
              label={t("importer.autoImport")}
              description={t("importer.autoImport.desc")}
              checked={autoImport}
              onChange={setAutoImport}
            />
            <CheckboxRow
              label={t("importer.saveDms")}
              description={t("importer.saveDms.desc")}
              checked={false}
              onChange={() => {}}
              disabled
            />
          </div>

          {/* Submit + result */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={pending || !sessionKey.trim()}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-40"
            >
              {pending ? t("importer.submitting") : t("importer.submit")}
            </button>
            {msg && (
              <p className={`text-xs ${msg.ok ? "text-primary" : "text-error"}`}>{msg.text}</p>
            )}
          </div>
        </form>

        {/* Notes */}
        <section className="mt-8 space-y-4 text-sm text-text-secondary">
          <div>
            <h2 className="mb-2 font-display text-lg text-text-primary">{t("importer.notesTitle")}</h2>
            <p className="leading-relaxed">{t("importer.notes1")}</p>
            <p className="mt-2 leading-relaxed">{t("importer.notes2")}</p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-lg text-text-primary">{t("importer.autoImportTitle")}</h2>
            <p className="leading-relaxed">{t("importer.autoImportBody")}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function CheckboxRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-white/10 bg-surface-3 accent-primary disabled:cursor-not-allowed"
      />
      <span className="text-sm">
        <span className="text-text-primary">{label}</span>
        <br />
        <span className="text-xs text-text-tertiary">{description}</span>
      </span>
    </label>
  );
}
