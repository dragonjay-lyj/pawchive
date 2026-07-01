"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";
import {
  listImporterHistory,
  recordImporterSubmission,
  clearImporterHistory,
  type ImporterHistoryEntry,
} from "@/lib/importerHistory";

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
  const initial = useMemo(() => {
    if (typeof window === "undefined") return { service: "patreon", key: "" };
    const p = new URLSearchParams(window.location.search);
    const s = p.get("service") ?? "";
    const k = p.get("key") ?? "";
    const validService = SERVICES.some((x) => x.key === s) ? s : "patreon";
    return { service: validService, key: k };
  }, []);
  const [service, setService] = useState(initial.service);
  const [sessionKey, setSessionKey] = useState(initial.key);
  const [channelIds, setChannelIds] = useState("");
  const [authId, setAuthId] = useState("");
  const [xbc, setXbc] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [saveKey, setSaveKey] = useState(true);
  const [autoImport, setAutoImport] = useState(true);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<ImporterHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(listImporterHistory());
    const on = () => setHistory(listImporterHistory());
    window.addEventListener("pawchive:importer-history-change", on);
    return () => window.removeEventListener("pawchive:importer-history-change", on);
  }, []);

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
        recordImporterSubmission({ service, ok: true, autoImport, saveKey });
      } else {
        const raw = await res.text().catch(() => "");
        const parsed = parseUpstreamError(raw, res.status);
        const text = parsed || t("importer.failed");
        setMsg({ ok: false, text });
        recordImporterSubmission({ service, ok: false, autoImport, saveKey, message: text.slice(0, 200) });
      }
    } catch (e: any) {
      const text = e?.message || t("importer.failed");
      setMsg({ ok: false, text });
      recordImporterSubmission({ service, ok: false, autoImport, saveKey, message: text.slice(0, 200) });
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
              <div
                className={`rounded-lg border px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                  msg.ok
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-error/30 bg-error/5 text-error"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </form>

        {/* Submission history — local */}
        {history.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg">{t("importer.history")}</h2>
                <p className="text-[11px] text-text-tertiary">{t("importer.history.hint")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(t("importer.history.confirmClear"))) clearImporterHistory();
                }}
                className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:border-error/40 hover:text-error"
              >
                {t("importer.history.clear")}
              </button>
            </div>
            <ul className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface-1">
              {history.slice(0, 10).map((h) => (
                <li key={h.ts} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <span
                    className={
                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium " +
                      (h.ok ? "bg-primary/15 text-primary" : "bg-error/15 text-error")
                    }
                  >
                    {h.ok ? t("importer.history.ok") : t("importer.history.err")}
                  </span>
                  <span className="font-mono text-text-secondary capitalize">{h.service}</span>
                  <span className="text-text-tertiary flex-1 truncate">
                    {h.message || (h.autoImport ? "auto-import" : "manual")}
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">
                    {new Date(h.ts).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

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

/**
 * Parse an upstream error response body into a compact message.
 * pawchive.st returns plain text with one error per line for 4xx.
 * Some paths still return HTML — for those we grab <title> or a
 * .flash / .error block. Falls back to trimmed raw content.
 */
function parseUpstreamError(raw: string, status: number): string {
  const body = raw.trim();
  if (!body) return `HTTP ${status}`;

  // HTML response? Try to extract a meaningful chunk.
  if (/^\s*<(!doctype|html)/i.test(body) || /<\/html>/i.test(body)) {
    const title = body.match(/<title>([^<]{2,200})<\/title>/i)?.[1]?.trim();
    const flash = body.match(/<[^>]+class="[^"]*(?:flash|error|alert)[^"]*"[^>]*>([\s\S]{2,400}?)<\//i)?.[1];
    const cleaned = (flash ?? title ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (cleaned) return `${cleaned} (HTTP ${status})`;
    return `HTTP ${status}`;
  }

  // Plain text: split into non-empty lines, keep the informative ones.
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const preview = lines.slice(0, 4).join("\n");
  const suffix = lines.length > 4 ? `\n… +${lines.length - 4} more` : "";
  return preview.length > 500 ? preview.slice(0, 500) + "…" : preview + suffix;
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
