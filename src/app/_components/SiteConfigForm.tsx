"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { buildDeepLXUrl } from "@/lib/translate";

interface PublicSiteConfig {
  translationBaseUrl: string;
  hasTranslationApiKey: boolean;
  aiSearchEndpoint: string;
}

interface Props {
  admin: boolean;
}

export function SiteConfigForm({ admin }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PublicSiteConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiEndpoint, setAiEndpoint] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store" });
        const json = (await res.json()) as PublicSiteConfig;
        if (!cancelled) {
          setConfig(json);
          setBaseUrl(json.translationBaseUrl);
          setAiEndpoint(json.aiSearchEndpoint);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const payload: Record<string, string> = {
        translationBaseUrl: baseUrl.trim(),
        aiSearchEndpoint: aiEndpoint.trim(),
      };
      // Only send the API key if the admin typed a fresh value (blank means "leave existing").
      if (apiKey) payload.translationApiKey = apiKey;
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setConfig(json.config);
      setApiKey("");
      setSaved(true);
      window.dispatchEvent(new CustomEvent("pawchive:site-config-change"));
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setErr(e?.message ?? "network");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-xs text-text-tertiary">{t("common.loading")}</p>;
  }

  const configured = !!config?.translationBaseUrl;
  const preview = (() => {
    if (!baseUrl.trim()) return "";
    try {
      // Preview using the fresh key if the admin typed one, otherwise
      // fall back to a placeholder that doesn't leak the stored key.
      const keyForPreview = apiKey || (config?.hasTranslationApiKey ? "***" : "");
      return buildDeepLXUrl(baseUrl, keyForPreview);
    } catch (e: any) {
      return e?.message ?? "invalid";
    }
  })();

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
        <span
          className={
            "inline-block h-2 w-2 rounded-full " +
            (configured ? "bg-primary" : "bg-text-tertiary")
          }
        />
        <span>
          {configured
            ? `Server endpoint configured${config?.hasTranslationApiKey ? " (with API key)" : ""}`
            : "Server endpoint not configured — translation is disabled for everyone."}
        </span>
      </div>

      {!admin ? (
        <p className="text-xs text-text-tertiary">
          {t("settings.translation.readOnly")}
        </p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium">
              {t("settings.translation.baseUrlLabel")}
            </label>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("settings.translation.baseUrlHint")}
            </p>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deeplx.org"
              className="mt-2 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              {t("settings.translation.apiKeyLabel")}
            </label>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("settings.translation.apiKeyHint")}
              {config?.hasTranslationApiKey && (
                <span className="ml-1 text-primary">(existing key on file — leave blank to keep)</span>
              )}
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.hasTranslationApiKey ? "•••••••• (unchanged)" : "admin"}
              className="mt-2 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              {t("settings.ai.endpointLabel")}
            </label>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("settings.ai.endpointHint")}
            </p>
            <input
              type="url"
              value={aiEndpoint}
              onChange={(e) => setAiEndpoint(e.target.value)}
              placeholder="https://your-service.example/search"
              className="mt-2 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {preview && (
            <div className="pt-3 border-t border-white/5">
              <p className="text-[11px] text-text-tertiary mb-1">{t("settings.translation.preview")}</p>
              <code className="block break-all rounded-md bg-surface-2 px-2 py-1 text-[11px] font-mono text-text-secondary">
                {preview}
              </code>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-40"
            >
              {saving ? t("common.loading") : t("common.save")}
            </button>
            {saved && <span className="text-xs text-primary">✓ {t("common.saved")}</span>}
            {err && <span className="text-xs text-error">{err}</span>}
          </div>
        </>
      )}
    </div>
  );
}
