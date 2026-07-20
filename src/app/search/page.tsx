"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { getRecentPosts, getThumbnailUrl, getServiceColor, getServiceLabel } from "@/lib/api";
import type { Post, ServiceType } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { CreatorSearchInline } from "@/app/_components/CreatorSearchInline";
import { useI18n } from "@/lib/i18n/provider";
import { SiteNav } from "@/app/_components/SiteNav";

// ============================================================
// Search Page — Standard + Advanced + AI (placeholder)
// ============================================================

const PLATFORMS: { key: ServiceType; label: string }[] = [
  { key: "patreon", label: "Patreon" },
  { key: "fanbox", label: "Fanbox" },
  { key: "fantia", label: "Fantia" },
  { key: "subscribestar", label: "SubscribeStar" },
  { key: "discord", label: "Discord" },
  { key: "gumroad", label: "Gumroad" },
  { key: "boosty", label: "Boosty" },
  { key: "afdian", label: "爱发电" },
];

const FILE_TYPES = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "zip", "pdf"] as const;

type Tab = "standard" | "advanced" | "creators" | "ai";

interface Filters {
  platforms: Set<ServiceType>;
  fileTypes: Set<string>;
  dateFrom: string; // ISO date
  dateTo: string;
  requireAttachments: boolean;
}

const EMPTY_FILTERS: Filters = {
  platforms: new Set(),
  fileTypes: new Set(),
  dateFrom: "",
  dateTo: "",
  requireAttachments: false,
};

function dedupe(posts: Post[]): Post[] {
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const p of posts) {
    const k = `${p.service}:${p.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

// Upstream pawchive.pw supports server-side q= search on /api/v1/posts,
// so we query it directly (fast) and page with offset. Advanced filters
// (platform / file type / date) refine the returned results client-side.
const PAGE_SIZE = 50;

export default function SearchPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("standard");
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState<Post[]>([]); // server search results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef<string>("");

  // Run a fresh server-side search for the given query.
  const runSearch = async (q: string) => {
    activeQueryRef.current = q;
    setLoading(true);
    setError(null);
    setSearched(true);
    setPool([]);
    setOffset(0);
    setReachedEnd(false);
    try {
      const results = await getRecentPosts({ q, o: 0 });
      if (activeQueryRef.current !== q) return; // superseded by newer query
      setPool(dedupe(results));
      setOffset(PAGE_SIZE);
      if (results.length < PAGE_SIZE) setReachedEnd(true);
    } catch {
      if (activeQueryRef.current === q) setError("Search failed. Please try again.");
    } finally {
      if (activeQueryRef.current === q) setLoading(false);
    }
  };

  // Load the next page of the current query.
  const loadMore = async () => {
    const q = query.trim();
    if (!q || loading || reachedEnd) return;
    setLoading(true);
    try {
      const results = await getRecentPosts({ q, o: offset });
      if (activeQueryRef.current !== q) return;
      setPool((prev) => dedupe([...prev, ...results]));
      setOffset((o) => o + PAGE_SIZE);
      if (results.length < PAGE_SIZE) setReachedEnd(true);
    } catch {
      setError("Failed to load more.");
    } finally {
      setLoading(false);
    }
  };

  // Debounced query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearched(false);
      setPool([]);
      setReachedEnd(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(query.trim());
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Advanced filters refine the server results client-side.
  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return pool.filter((p) => {
      if (filters.platforms.size && !filters.platforms.has(p.service as ServiceType)) return false;
      if (filters.fileTypes.size) {
        const all = [p.file, ...p.attachments].filter(Boolean);
        const hit = all.some((f) => {
          const ext = f.name?.match(/\.(\w+)$/)?.[1]?.toLowerCase();
          return ext && filters.fileTypes.has(ext);
        });
        if (!hit) return false;
      }
      if (filters.requireAttachments && p.attachments.length === 0) return false;
      const pub = p.published ? new Date(p.published) : null;
      if (pub && filters.dateFrom && pub < new Date(filters.dateFrom)) return false;
      if (pub && filters.dateTo && pub > new Date(filters.dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [pool, query, filters]);

  // Infinite scroll → load next page of the query
  useEffect(() => {
    if (!query.trim() || loading || reachedEnd) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, loading, reachedEnd, offset]);

  const activeFilterCount =
    filters.platforms.size +
    filters.fileTypes.size +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.requireAttachments ? 1 : 0);

  const loadedCount = pool.length;

  const togglePlatform = (p: ServiceType) => {
    setFilters((f) => {
      const n = new Set(f.platforms);
      if (n.has(p)) n.delete(p); else n.add(p);
      return { ...f, platforms: n };
    });
  };
  const toggleFileType = (t: string) => {
    setFilters((f) => {
      const n = new Set(f.fileTypes);
      if (n.has(t)) n.delete(t); else n.add(t);
      return { ...f, fileTypes: n };
    });
  };
  const resetFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="min-h-screen">
      <SiteNav active="search" showRightLinks={false} />

      <main className="mx-auto max-w-[960px] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="pt-8">
          {/* Tab switcher */}
          <div className="mica mb-6 inline-flex rounded-xl border border-white/5 p-1">
            {(["standard", "advanced", "creators", "ai"] as Tab[]).map((tabId) => {
              const label =
                tabId === "standard" ? t("search.tab.standard")
                : tabId === "advanced" ? t("search.tab.advanced")
                : tabId === "creators" ? t("search.tab.creators")
                : t("search.tab.ai");
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setTab(tabId)}
                  className={
                    "rounded-lg px-4 py-1.5 text-xs font-medium transition-all " +
                    (tab === tabId
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Standard + Advanced share the post search input */}
          {(tab === "standard" || tab === "advanced") && (
            <>
              <div className="glass-strong relative mx-auto max-w-2xl rounded-2xl p-1 mb-6">
                <div className="flex items-center gap-3 px-4">
                  <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("search.placeholder")}
                    className="glass-focus w-full bg-transparent py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {tab === "advanced" && (
                <AdvancedFilters
                  filters={filters}
                  onTogglePlatform={togglePlatform}
                  onToggleFileType={toggleFileType}
                  onDateFrom={(v) => setFilters((f) => ({ ...f, dateFrom: v }))}
                  onDateTo={(v) => setFilters((f) => ({ ...f, dateTo: v }))}
                  onToggleAttachments={(v) => setFilters((f) => ({ ...f, requireAttachments: v }))}
                  onReset={resetFilters}
                />
              )}

              {error && <div className="glass rounded-2xl p-4 text-center text-sm text-error mb-6">{error}</div>}
              {loading && pool.length === 0 && searched && (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="skeleton h-20 w-20 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-3/4 rounded" />
                        <div className="skeleton h-3 w-full rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && searched && filtered.length === 0 && query.trim() && (
                <div className="glass rounded-2xl p-12 text-center">
                  <p className="text-text-secondary">
                    {t("search.noResults", { query })}
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="mt-3 text-xs text-primary hover:underline"
                    >
                      {t("common.clearFilters")}
                    </button>
                  )}
                </div>
              )}
              {filtered.length > 0 && (
                <div className="space-y-2">
                  <p className="mb-3 text-xs text-text-tertiary">
                    {t("search.resultCount", { count: filtered.length })}
                    {activeFilterCount > 0 && (
                      <span> · {t("search.filteredFrom", { total: loadedCount })} · <button onClick={resetFilters} className="text-primary hover:underline">{t("common.clearFilters")}</button></span>
                    )}
                  </p>
                  {filtered.map((post, i) => (
                    <Link key={post.id + "-" + i} href={"/" + post.service + "/user/" + post.user + "/post/" + post.id} className="flex gap-3 rounded-xl bg-surface-1 p-3 transition-colors hover:bg-surface-2 sm:gap-4 sm:p-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-3 sm:h-20 sm:w-20">
                        <img src={getThumbnailUrl(post)} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                        <h3 className="truncate text-sm font-medium sm:text-base">{post.title || t("post.untitled")}</h3>
                        <div className="flex items-center gap-2">
                          <span className="neo-badge inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ color: getServiceColor(post.service) }}>
                            {getServiceLabel(post.service)}
                          </span>
                          <span className="text-[10px] text-text-tertiary">{formatRelativeDate(post.published)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <div ref={loaderRef} className="h-4" />
              {loading && pool.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {reachedEnd && searched && filtered.length > 0 && (
                <p className="mt-6 text-center text-[11px] text-text-tertiary">
                  {t("common.endOfFeed")}
                </p>
              )}
            </>
          )}

          {tab === "creators" && <CreatorSearchInline />}

          {tab === "ai" && <SmartSearchPanel />}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Advanced Filters — MD3 form
// ============================================================
function AdvancedFilters({
  filters,
  onTogglePlatform,
  onToggleFileType,
  onDateFrom,
  onDateTo,
  onToggleAttachments,
  onReset,
}: {
  filters: Filters;
  onTogglePlatform: (p: ServiceType) => void;
  onToggleFileType: (t: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onToggleAttachments: (v: boolean) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="glass mb-6 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-medium">{t("search.adv.title")}</h3>
        <button onClick={onReset} className="text-xs text-text-tertiary hover:text-primary">{t("common.clear")}</button>
      </div>

      {/* Platforms */}
      <div>
        <p className="mb-2 text-xs text-text-tertiary">{t("search.adv.platforms")}</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = filters.platforms.has(p.key);
            const color = getServiceColor(p.key);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onTogglePlatform(p.key)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all " +
                  (active
                    ? "border-transparent bg-primary text-on-primary"
                    : "border-white/10 text-text-secondary hover:bg-surface-2")
                }
                style={active ? undefined : { color }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* File types */}
      <div>
        <p className="mb-2 text-xs text-text-tertiary">{t("search.adv.fileTypes")}</p>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((t) => {
            const active = filters.fileTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => onToggleFileType(t)}
                className={
                  "rounded-md border px-2.5 py-1 text-[11px] font-mono uppercase transition-all " +
                  (active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 text-text-secondary hover:bg-surface-2")
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">{t("search.adv.publishedFrom")}</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onDateFrom(e.target.value)}
            className="rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">{t("search.adv.publishedTo")}</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onDateTo(e.target.value)}
            className="rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {/* Toggles */}
      <label className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm">{t("search.adv.requireAttachments")}</p>
          <p className="text-xs text-text-tertiary">{t("search.adv.requireAttachments.desc")}</p>
        </div>
        <input
          type="checkbox"
          checked={filters.requireAttachments}
          onChange={(e) => onToggleAttachments(e.target.checked)}
          className="peer sr-only"
          id="req-att"
        />
        <label
          htmlFor="req-att"
          className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border border-white/10 bg-surface-3 transition-all peer-checked:bg-primary peer-checked:border-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4"
        />
      </label>
    </div>
  );
}

// ============================================================
// Smart Search — Placeholder (natural language + reverse image)
// ============================================================
function SmartSearchPanel() {
  const { t } = useI18n();
  const [nlq, setNlq] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Post[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setEndpoint(json?.aiSearchEndpoint || "");
      } catch {}
    })();
    const on = () => {
      fetch("/api/site-config", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setEndpoint(j?.aiSearchEndpoint || ""))
        .catch(() => {});
    };
    window.addEventListener("pawchive:site-config-change", on);
    return () => {
      cancelled = true;
      window.removeEventListener("pawchive:site-config-change", on);
    };
  }, []);

  const onImage = (file: File | null) => {
    setImgFile(file);
    setImgPreview(null);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImgPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submit = async () => {
    if (!nlq.trim() && !imgFile) return;
    if (!endpoint) {
      // Fallback: run keyword search via the standard tab query param
      window.location.href = `/search?q=${encodeURIComponent(nlq)}`;
      return;
    }
    setLoading(true);
    setErr(null);
    setResults(null);

    try {
      const body: Record<string, unknown> = { query: nlq };
      if (imgFile) {
        body.image = await fileToDataUrl(imgFile);
        body.image_name = imgFile.name;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
      const data = await res.json();
      const posts = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setResults(posts as Post[]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cyberpunk-styled hero */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-platform-fantia/10 p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-platform-fantia/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {t("search.ai.badge")}
            </span>
            <span className="text-[10px] text-text-tertiary font-mono">{t("search.ai.experimental")}</span>
            {endpoint && (
              <span className="ml-auto rounded-md bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-300">
                Endpoint configured
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl leading-snug">{t("search.ai.title")}</h2>
          <p className="mt-2 max-w-lg text-sm text-text-secondary">{t("search.ai.subtitle")}</p>
        </div>
      </div>

      {/* Natural language input */}
      <div className="glass-strong rounded-2xl p-5">
        <label className="mb-2 block text-xs text-text-tertiary">{t("search.ai.nlLabel")}</label>
        <textarea
          value={nlq}
          onChange={(e) => setNlq(e.target.value)}
          rows={3}
          placeholder={t("search.ai.nlPlaceholder")}
          className="glass-focus w-full resize-none rounded-xl border border-white/5 bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10px] text-text-tertiary">
            {endpoint ? (
              <>Endpoint: <code className="font-mono">{endpoint.replace(/^https?:\/\//, "")}</code></>
            ) : (
              t("search.ai.nlNote")
            )}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={loading || (!nlq.trim() && !imgFile)}
            className="neo-badge rounded-xl px-4 py-2 text-xs font-bold text-text-primary disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? t("common.loading") : t("search.ai.searchBtn")}
          </button>
        </div>
      </div>

      {/* Reverse image search */}
      <div className="glass-strong rounded-2xl p-5">
        <label className="mb-2 block text-xs text-text-tertiary">{t("search.ai.reverse")}</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface-2 p-6 text-center text-xs text-text-tertiary transition-colors hover:border-primary/40 hover:text-text-secondary">
            {imgPreview ? (
              <img src={imgPreview} alt="preview" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <>
                <span className="text-2xl">📎</span>
                <span className="mt-2">{t("search.ai.upload")}</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onImage(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex-1 space-y-2 text-xs text-text-tertiary">
            <p>{t("search.ai.hashHint")}{" "}
              <Link href="/hash-lookup" className="text-primary hover:underline">
                {t("nav.hashLookup")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Results / error */}
      {err && (
        <div className="glass rounded-2xl p-4 text-center text-sm text-error">{err}</div>
      )}
      {results && (
        <div className="space-y-2">
          <p className="text-[11px] text-text-tertiary">
            {results.length} result{results.length === 1 ? "" : "s"} from endpoint
          </p>
          {results.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-sm text-text-secondary">
              {t("common.noResults")}
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((post: Post, i) => (
                <Link key={post.id + "-" + i} href={"/" + post.service + "/user/" + post.user + "/post/" + post.id} className="flex gap-3 rounded-xl bg-surface-1 p-3 transition-colors hover:bg-surface-2">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    <img src={getThumbnailUrl(post)} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <h3 className="truncate text-sm font-medium">{post.title || t("post.untitled")}</h3>
                    <div className="flex items-center gap-2">
                      <span className="neo-badge inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ color: getServiceColor(post.service) }}>
                        {getServiceLabel(post.service)}
                      </span>
                      {post.published && (
                        <span className="text-[10px] text-text-tertiary">{formatRelativeDate(post.published)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
