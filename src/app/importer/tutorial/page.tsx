"use client";

import Link from "next/link";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";

const COOKIE_MAP: { platform: string; cookie: string; url: string }[] = [
  { platform: "Patreon", cookie: "session_id", url: "https://www.patreon.com/" },
  { platform: "Pixiv Fanbox", cookie: "FANBOXSESSID", url: "https://www.fanbox.cc/" },
  { platform: "Gumroad", cookie: "_gumroad_app_session", url: "https://gumroad.com/" },
  { platform: "SubscribeStar", cookie: "_personalization_id", url: "https://subscribestar.adult/" },
  { platform: "Fantia", cookie: "_session_id", url: "https://fantia.jp/" },
  { platform: "Boosty", cookie: "auth", url: "https://boosty.to/" },
  { platform: "爱发电 / Afdian", cookie: "auth_token", url: "https://afdian.net/" },
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

        {/* Cookie table */}
        <section className="glass rounded-2xl p-5 mb-8">
          <h2 className="mb-3 font-display text-lg">{t("tutorial.cookieMap")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-text-tertiary">
                  <th className="py-2 pr-4 font-medium">Paysite</th>
                  <th className="py-2 pr-4 font-medium">Cookie name</th>
                  <th className="py-2 font-medium">Login</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_MAP.map((row) => (
                  <tr key={row.platform} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-4">{row.platform}</td>
                    <td className="py-2 pr-4">
                      <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono text-primary">
                        {row.cookie}
                      </code>
                    </td>
                    <td className="py-2">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-secondary hover:text-primary hover:underline"
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
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
