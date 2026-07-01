"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";
import {
  listTranslationHistory,
  translationCacheSize,
  clearTranslationCache,
  removeTranslationCacheEntry,
  type TranslationHistoryEntry,
} from "@/lib/translate";

const INITIAL_VISIBLE = 5;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function TranslationHistoryPanel() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<TranslationHistoryEntry[]>([]);
  const [size, setSize] = useState({ entries: 0, bytes: 0 });
  const [showAll, setShowAll] = useState(false);

  const refresh = useCallback(() => {
    setEntries(listTranslationHistory());
    setSize(translationCacheSize());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("pawchive:translate-cache-change", onChange);
    return () => window.removeEventListener("pawchive:translate-cache-change", onChange);
  }, [refresh]);

  const clear = () => {
    if (entries.length === 0) return;
    if (!confirm(t("settings.translation.history.confirmClear", { count: entries.length }))) return;
    clearTranslationCache();
    refresh();
  };

  const remove = (key: string) => {
    removeTranslationCacheEntry(key);
    refresh();
  };

  const exportJson = () => {
    if (entries.length === 0) return;
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `pawchive-translations-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const visible = showAll ? entries : entries.slice(0, INITIAL_VISIBLE);

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{t("settings.translation.history")}</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            {t("settings.translation.history.desc")}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
          <span>
            {t("settings.translation.history.size", {
              entries: size.entries,
              size: formatBytes(size.bytes),
            })}
          </span>
          {entries.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:border-primary/40 hover:text-primary"
              >
                {t("settings.translation.history.export")}
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-text-secondary hover:border-error/40 hover:text-error"
              >
                {t("settings.translation.history.clear")}
              </button>
            </>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t("settings.translation.history.empty")}</p>
      ) : (
        <>
          <ul className="divide-y divide-white/5">
            {visible.map((e) => (
              <li key={e.key} className="group py-2 flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono uppercase text-text-tertiary">
                  {e.target}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs text-text-secondary">{e.source || "(unknown source)"}</p>
                  <p className="line-clamp-1 text-xs text-text-primary">{e.translated}</p>
                  <p className="mt-0.5 text-[10px] text-text-tertiary">{formatRelative(e.ts)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(e.key)}
                  aria-label={t("settings.translation.history.remove")}
                  title={t("settings.translation.history.remove")}
                  className="rounded-md px-1.5 py-0.5 text-[10px] text-text-tertiary opacity-0 transition-opacity hover:bg-error/20 hover:text-error group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {!showAll && entries.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs text-primary hover:underline"
            >
              {t("settings.translation.history.showMore", { count: entries.length })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
