"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";

interface CookieRow {
  service: string;
  platform: string;
  cookie: string;
  url: string;
}

const COOKIE_MAP: CookieRow[] = [
  { service: "patreon", platform: "Patreon", cookie: "session_id", url: "https://www.patreon.com/" },
  { service: "fanbox", platform: "Pixiv Fanbox", cookie: "FANBOXSESSID", url: "https://www.fanbox.cc/" },
  { service: "gumroad", platform: "Gumroad", cookie: "_gumroad_app_session", url: "https://gumroad.com/" },
  { service: "subscribestar", platform: "SubscribeStar", cookie: "_personalization_id", url: "https://subscribestar.adult/" },
  { service: "fantia", platform: "Fantia", cookie: "_session_id", url: "https://fantia.jp/" },
  { service: "boosty", platform: "Boosty", cookie: "auth", url: "https://boosty.to/" },
  { service: "afdian", platform: "爱发电 / Afdian", cookie: "auth_token", url: "https://afdian.net/" },
];

const DISCORD_SNIPPET =
  `(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`;

export default function TutorialPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3 text-xs text-text-tertiary">
          <Link href="/importer" className="hover:text-primary hover:underline">
            ← {t("importer.title")}
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold">{t("tutorial.title")}</h1>
        <p className="mt-2 mb-6 text-sm text-text-secondary">{t("tutorial.intro")}</p>

        {/* Cookie table + bookmarklets */}
        <section className="glass rounded-2xl p-5 mb-8">
          <h2 className="mb-3 font-display text-lg">{t("tutorial.cookieMap")}</h2>
          <p className="mb-3 text-xs text-text-tertiary">
            {t("tutorial.bookmarkletHint")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-text-tertiary">
                  <th className="py-2 pr-4 font-medium">Paysite</th>
                  <th className="py-2 pr-4 font-medium">Cookie</th>
                  <th className="py-2 pr-4 font-medium">Login</th>
                  <th className="py-2 font-medium">Bookmarklet</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_MAP.map((row) => (
                  <CookieRow key={row.platform} {...row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Browser instructions */}
        <div className="space-y-6">
          <BrowserGuide
            title={t("tutorial.chrome")}
            steps={[t("tutorial.chromeStep1"), t("tutorial.chromeStep2"), t("tutorial.chromeStep3")]}
          />
          <BrowserGuide
            title={t("tutorial.safari")}
            steps={[t("tutorial.safariStep1"), t("tutorial.safariStep2"), t("tutorial.safariStep3")]}
          />
          <BrowserGuide
            title={t("tutorial.firefox")}
            steps={[t("tutorial.firefoxStep1"), t("tutorial.firefoxStep2")]}
          />
        </div>

        <p className="mt-6 text-xs text-text-tertiary">{t("tutorial.otherBrowsers")}</p>

        {/* Discord */}
        <section className="glass mt-10 rounded-2xl p-5">
          <h2 className="mb-3 font-display text-lg">{t("tutorial.discord")}</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
            <li>{t("tutorial.discordStep1")}</li>
            <li>{t("tutorial.discordStep2")}</li>
            <li>{t("tutorial.discordStep3")}</li>
          </ol>
          <div className="mt-4">
            <p className="mb-1 text-xs text-text-tertiary">Snippet:</p>
            <pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 text-[11px] font-mono leading-relaxed text-text-secondary">
{DISCORD_SNIPPET}
            </pre>
          </div>
          <p className="mt-3 text-xs text-text-tertiary">{t("tutorial.channelHelp")}</p>
        </section>

        {/* Warning */}
        <div className="mt-8 rounded-2xl border border-error/30 bg-error/5 p-4 text-xs text-text-secondary">
          <p className="font-medium text-error">⚠️ {t("tutorial.warning")}</p>
        </div>
      </main>
    </div>
  );
}

function BrowserGuide({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h3 className="mb-3 font-display text-base">{title}</h3>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-text-secondary">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </section>
  );
}

// ============================================================
// Cookie row with copy + bookmarklet
// ============================================================
function buildBookmarklet(service: string, cookieName: string, importerOrigin: string): string {
  // Runs on the paysite tab; reads document.cookie for the specific name
  // then opens Pawchive's Importer with service and key prefilled.
  const src = `(function(){var m=document.cookie.match(new RegExp('(?:^|; )'+${JSON.stringify(cookieName)}+'=([^;]+)'));if(!m){alert('${cookieName} cookie not found. Make sure you\\'re signed in and on the paysite tab.');return;}var url='${importerOrigin}/importer?service=${service}&key='+encodeURIComponent(m[1]);window.open(url,'_blank');})();`;
  return `javascript:${encodeURIComponent(src)}`;
}

function CookieRow({ service, platform, cookie, url }: CookieRow) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string>("");

  // Read window.location only on client to avoid hydration mismatch
  const bookmarklet = origin ? buildBookmarklet(service, cookie, origin) : "";

  const copy = async () => {
    try {
      if (!origin) return;
      await navigator.clipboard.writeText(bookmarklet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <tr
      className="border-b border-white/5 last:border-0"
      ref={(el) => {
        if (el && !origin && typeof window !== "undefined") setOrigin(window.location.origin);
      }}
    >
      <td className="py-2 pr-4">{platform}</td>
      <td className="py-2 pr-4">
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono text-primary">
          {cookie}
        </code>
      </td>
      <td className="py-2 pr-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-secondary hover:text-primary hover:underline"
        >
          Open →
        </a>
      </td>
      <td className="py-2 flex items-center gap-2">
        {bookmarklet ? (
          <a
            href={bookmarklet}
            onClick={(e) => e.preventDefault()}
            draggable
            className="cursor-grab rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
            title="Drag to bookmarks bar, then click while on the paysite tab"
          >
            📎 Drag me
          </a>
        ) : (
          <span className="text-[10px] text-text-tertiary">…</span>
        )}
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-white/10 bg-surface-2 px-2 py-0.5 text-[10px] text-text-secondary hover:border-primary/40 hover:text-primary"
          title="Copy javascript: URL"
        >
          {copied ? "✓" : "Copy"}
        </button>
      </td>
    </tr>
  );
}
