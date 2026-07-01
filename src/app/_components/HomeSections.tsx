"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { key: "patreon", label: "Patreon", color: "#FF424D" },
  { key: "fanbox", label: "Fanbox", color: "#4A90D9" },
  { key: "fantia", label: "Fantia", color: "#FF6FB5" },
  { key: "subscribestar", label: "SubscribeStar", color: "#35C759" },
  { key: "discord", label: "Discord", color: "#5865F2" },
  { key: "gumroad", label: "Gumroad", color: "#FF90E8" },
] as const;

export function HomeHero() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
      <div className="bento bg-surface-1 sm:col-span-2 lg:col-span-2 lg:row-span-2 relative flex min-h-[320px] flex-col justify-end overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-platform-patreon/10" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {t("home.hero.tag")}
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
            {t("home.hero.title1")}
            <br />
            <span className="text-primary">{t("home.hero.title2")}</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-text-secondary sm:text-base">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/browse"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
            >
              {t("home.hero.start")}
            </Link>
            <Link
              href="/search"
              className="glass rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:bg-white/8"
            >
              {t("nav.search")}
            </Link>
          </div>
        </div>
      </div>

      <StatCard value="30K+" label={t("home.stats.creators")} icon="🎨" gradient="from-platform-patreon/20 to-transparent" />
      <StatCard value="6" label={t("home.stats.platforms")} icon="🔗" gradient="from-platform-fanbox/20 to-transparent" />
      <StatCard value={t("home.stats.updatesValue")} label={t("home.stats.updates")} icon="⚡" gradient="from-platform-fantia/20 to-transparent" />
      <StatCard value={t("home.stats.accessValue")} label={t("home.stats.access")} icon="🔓" gradient="from-primary/20 to-transparent" />
    </div>
  );
}

function StatCard({ value, label, icon, gradient }: { value: string; label: string; icon: string; gradient: string }) {
  return (
    <div className={cn(
      "bento bg-surface-1 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden min-h-[140px]",
      "bg-gradient-to-br",
      gradient
    )}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-display text-2xl font-bold sm:text-3xl">{value}</p>
        <p className="text-xs text-text-secondary sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

export function HomeAnnouncementBar() {
  const { t } = useI18n();
  return (
    <div className="mica mb-16 flex items-center gap-3 rounded-2xl border border-white/5 px-4 py-3 sm:px-6">
      <span className="flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <p className="text-sm text-text-secondary">
        <span className="font-medium text-text-primary">{t("home.announcement.title")}</span> {t("home.announcement.body")}
        <Link href="/importer" className="ml-2 font-medium text-primary underline underline-offset-4 hover:text-primary/80">
          {t("home.announcement.cta")}
        </Link>
      </p>
    </div>
  );
}

export function HomePlatformPills() {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="mb-4 font-display text-xl">{t("home.platforms.title")}</h2>
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map((p) => (
          <Link
            key={p.key}
            href={`/browse?platform=${p.key}`}
            className="neo-badge rounded-xl px-4 py-2 text-sm font-bold transition-all"
            style={{ color: p.color }}
          >
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HomeLatestHeader() {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h2 className="font-display text-xl sm:text-2xl">{t("home.latest.title")}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t("home.latest.subtitle")}</p>
      </div>
      <Link href="/browse" className="text-sm text-text-secondary transition-colors hover:text-primary">
        {t("home.viewAll")}
      </Link>
    </div>
  );
}
