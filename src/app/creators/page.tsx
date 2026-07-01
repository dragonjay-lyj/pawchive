"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getAllCreators, getServiceColor, getServiceLabel, getCreatorAvatarUrl } from "@/lib/api";
import type { Creator, ServiceType } from "@/lib/types";
import { SafeImage } from "@/app/_components/SafeImage";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";

const PAGE_SIZE = 200;
const PLATFORMS: ServiceType[] = [
  "patreon", "fanbox", "fantia", "subscribestar", "discord", "gumroad", "boosty", "afdian",
];

type Sort = "favorited" | "updated" | "name";

export default function CreatorsPage() {
  const { t } = useI18n();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [selPlatforms, setSelPlatforms] = useState<Set<ServiceType>>(new Set());
  const [sort, setSort] = useState<Sort>("favorited");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await getAllCreators();
        if (!cancelled) setCreators(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Unable to load creators.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reset visible when filters change so pagination starts over
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, sort, order, selPlatforms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = creators;

    if (q) {
      list = list.filter((c) => c.name?.toLowerCase().includes(q));
    }
    if (selPlatforms.size > 0) {
      list = list.filter((c) => selPlatforms.has(c.service));
    }

    const dir = order === "desc" ? -1 : 1;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "favorited":
          return (b.favorited - a.favorited) * (order === "desc" ? 1 : -1);
        case "updated":
          return (b.updated - a.updated) * (order === "desc" ? 1 : -1);
        case "name":
          return (a.name || "").localeCompare(b.name || "") * dir;
      }
    });
  }, [creators, query, selPlatforms, sort, order]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const togglePlatform = (p: ServiceType) => {
    setSelPlatforms((prev) => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setSelPlatforms(new Set());
  };
  const activeFilterCount = (query ? 1 : 0) + selPlatforms.size;

  return (
    <div className="min-h-screen">
      <SiteNav active="creators" />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("creators.title")}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {creators.length > 0
                ? t("creators.subtitleCount", { filtered: filtered.length.toLocaleString(), total: creators.length.toLocaleString() })
                : t("creators.subtitleEmpty")}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-text-tertiary hover:text-primary"
            >
              {t("common.clearFilters")}
            </button>
          )}
        </div>

        {/* Search + platform chips */}
        <div className="mb-6 space-y-3">
          <div className="glass-strong flex items-center gap-3 rounded-2xl px-4">
            <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("creators.searchPlaceholder")}
              className="w-full bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-text-tertiary hover:text-text-primary">
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PLATFORMS.map((p) => {
              const active = selPlatforms.has(p);
              const color = getServiceColor(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all " +
                    (active
                      ? "border-transparent bg-primary text-on-primary"
                      : "border-white/10 hover:bg-surface-2")
                  }
                  style={active ? undefined : { color }}
                >
                  {getServiceLabel(p)}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs text-text-secondary focus:outline-none"
              >
                <option value="favorited">{t("creators.sort.favorited")}</option>
                <option value="updated">{t("creators.sort.updated")}</option>
                <option value="name">{t("creators.sort.name")}</option>
              </select>
              <button
                type="button"
                onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
                className="rounded-xl border border-white/10 bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-3"
                title={t("creators.toggleOrder")}
              >
                {order === "desc" ? "↓" : "↑"}
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-1 p-3">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-2 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-error text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-xs text-primary hover:underline">{t("common.retry")}</button>
          </div>
        )}

        {!loading && !error && shown.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-text-secondary">{t("creators.noMatch")}</p>
          </div>
        )}

        {!loading && !error && shown.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((c) => {
                const color = getServiceColor(c.service);
                return (
                  <Link
                    key={c.service + "-" + c.id}
                    href={"/" + c.service + "/user/" + c.id}
                    className="flex items-center gap-3 rounded-xl bg-surface-1 p-3 transition-all hover:bg-surface-2"
                  >
                    <SafeImage
                      src={getCreatorAvatarUrl(c.service, c.id)}
                      alt={c.name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover bg-surface-2"
                      fallback={
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ backgroundColor: color + "20", color }}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span style={{ color }} className="font-medium">{getServiceLabel(c.service)}</span>
                        {c.favorited > 0 && <span className="text-text-tertiary">❤ {c.favorited}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-xl bg-surface-2 px-6 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-3 hover:text-text-primary"
                >
                  {t("common.showMore")} ({Math.min(PAGE_SIZE, filtered.length - visible).toLocaleString()}/{(filtered.length - visible).toLocaleString()})
                </button>
              </div>
            )}
            {!hasMore && filtered.length > 0 && (
              <p className="mt-6 text-center text-xs text-text-tertiary">
                {t("creators.allShown", { count: filtered.length.toLocaleString() })}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
