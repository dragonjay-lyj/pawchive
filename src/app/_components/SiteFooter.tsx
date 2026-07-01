"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAppVersion } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

export function SiteFooter() {
  const { t } = useI18n();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAppVersion()
      .then((v) => { if (!cancelled) setVersion(v); })
      .catch(() => { if (!cancelled) setVersion(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <footer className="mica border-t border-white/5 mt-16">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-text-tertiary sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm text-text-secondary">
            <span className="text-primary">Paw</span>chive
          </span>
          <span className="hidden sm:inline">· Community frontend for pawchive.st</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/importer" className="hover:text-text-secondary transition-colors">{t("nav.importer")}</Link>
          <Link href="/hash-lookup" className="hover:text-text-secondary transition-colors">{t("nav.hashLookup")}</Link>
          <Link href="/settings#about" className="hover:text-text-secondary transition-colors">{t("settings.about")}</Link>
          {version && (
            <a
              href={`https://github.com/search?q=${encodeURIComponent(version)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] rounded-md border border-white/5 bg-surface-1 px-2 py-1 hover:bg-surface-2 hover:text-text-secondary transition-colors"
              title="App commit hash"
            >
              {version.slice(0, 7)}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
