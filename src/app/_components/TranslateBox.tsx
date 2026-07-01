"use client";

import { useMemo, useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { loadPrefs } from "@/lib/preferences";
import {
  translateText,
  htmlToPlain,
  detectLangHeuristic,
  type TranslateResult,
} from "@/lib/translate";

interface Props {
  html?: string;         // Rich HTML source (renders via dangerouslySetInnerHTML)
  plain?: string;        // Plain text source (used for post comments)
  /** Compact variant: less padding + smaller controls. */
  compact?: boolean;
}

export function TranslateBox({ html, plain: plainProp, compact }: Props) {
  const { t, locale } = useI18n();
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [showTrans, setShowTrans] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const plain = useMemo(() => {
    if (plainProp !== undefined) return plainProp;
    return htmlToPlain(html ?? "");
  }, [html, plainProp]);
  const sourceLang = useMemo(() => detectLangHeuristic(plain), [plain]);

  // Re-read prefs when they change (e.g. admin updates endpoint)
  useMemo(() => {
    const on = () => setPrefs(loadPrefs());
    if (typeof window !== "undefined") {
      window.addEventListener("pawchive:prefs-change", on);
    }
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("pawchive:prefs-change", on);
    };
  }, []);

  // Skip translate button if content already in interface language,
  // if the user turned it off, or if no endpoint has been configured.
  const sameLang =
    (locale === "zh" && sourceLang === "zh") ||
    (locale === "en" && sourceLang === "en") ||
    plain.length < 10;
  const noEndpoint = !prefs.translationBaseUrl.trim();
  if (sameLang || !prefs.autoTranslate || noEndpoint) {
    return plainProp !== undefined ? (
      <p className="text-sm text-text-primary leading-relaxed break-words whitespace-pre-wrap">
        {plainProp}
      </p>
    ) : (
      <div
        className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed [&_a]:text-primary"
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
    );
  }

  const doTranslate = () => {
    if (pending) return;
    setErr(null);
    setProgress(null);
    startTransition(async () => {
      try {
        const r = await translateText(plain, locale, (p) => setProgress(p));
        setResult(r);
        setShowTrans(true);
      } catch (e: any) {
        setErr(e?.message || t("post.translate.failed"));
      } finally {
        setProgress(null);
      }
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {!showTrans ? (
          <button
            type="button"
            onClick={doTranslate}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-surface-2 px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:opacity-50"
          >
            {pending ? (
              <>
                <span className="h-2.5 w-2.5 animate-spin rounded-full border border-primary border-t-transparent" />
                <span>
                  {t("post.translating")}
                  {progress && progress.total > 1 && (
                    <span className="ml-1 font-mono">
                      {progress.done}/{progress.total}
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>🌐 {t("post.translate")}</>
            )}
          </button>
        ) : (
          <>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
              {t("post.translated", { engine: result?.engine ?? "" })}
            </span>
            <button
              type="button"
              onClick={() => setShowTrans(false)}
              className="text-[10px] text-text-tertiary hover:text-text-primary"
            >
              {t("post.showOriginal")}
            </button>
          </>
        )}
        {err && <span className="text-[10px] text-error">{err}</span>}
      </div>

      {showTrans && result ? (
        <div className={`${compact ? "text-sm" : "text-xs"} leading-relaxed whitespace-pre-wrap text-text-secondary`}>
          {result.text}
        </div>
      ) : plainProp !== undefined ? (
        <p className="text-sm text-text-primary leading-relaxed break-words whitespace-pre-wrap">
          {plainProp}
        </p>
      ) : (
        <div
          className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed [&_a]:text-primary"
          dangerouslySetInnerHTML={{ __html: html ?? "" }}
        />
      )}
    </div>
  );
}
