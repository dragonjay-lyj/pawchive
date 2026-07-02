"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRecentPosts, getThumbnailUrl, getServiceColor, getServiceLabel } from "@/lib/api";
import type { Post } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";

const FILTER_PLATFORMS = ["patreon","fanbox","fantia","subscribestar","discord","gumroad","boosty","afdian"] as const;
const FILTER_FORMATS = ["JPEG","PNG","GIF","MP4","ZIP","PSD"];
const PAGE_SIZE = 50;

export default function BrowsePage() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selPlatforms, setSelPlatforms] = useState<Set<string>>(new Set());
  const [selFormats, setSelFormats] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"grid"|"waterfall"|"list">("grid");
  const [sortOrder, setSortOrder] = useState<"newest"|"oldest">("newest");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const d = await getRecentPosts({ o: 0 });
        if (!cancelled) {
          setPosts(d);
          setHasMore(d.length >= PAGE_SIZE);
          setOffset(PAGE_SIZE);
        }
      } catch (e: unknown) { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const d = await getRecentPosts({ o: offset });
      setPosts(prev => [...prev, ...d]);
      setHasMore(d.length >= PAGE_SIZE);
      setOffset(prev => prev + PAGE_SIZE);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) {
    setter((prev) => { const n = new Set(prev); if (n.has(v)) n.delete(v); else n.add(v); return n; });
  }

  const clearFilters = () => {
    setSelPlatforms(new Set());
    setSelFormats(new Set());
    setSearchText("");
  };
  const activeCount = selPlatforms.size + selFormats.size + (searchText ? 1 : 0);

  const filtered = posts.filter(p => {
    if (selPlatforms.size > 0 && !selPlatforms.has(p.service)) return false;
    if (searchText && !p.title?.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (selFormats.size > 0) {
      const exts = [...p.attachments, p.file].filter(Boolean).map(f => (f as { name?: string }).name?.split(".").pop()?.toUpperCase() || "");
      if (!exts.some(e => selFormats.has(e))) return false;
    }
    return true;
  }).sort((a, b) => sortOrder === "newest" ? +new Date(b.published) - +new Date(a.published) : +new Date(a.published) - +new Date(b.published));

  const color = (s: string) => getServiceColor(s);
  const label = (s: string) => getServiceLabel(s);
  const thumb = (p: Post) => getThumbnailUrl(p);

  const filtersPanel = (
    <FiltersBody
      searchText={searchText}
      setSearchText={setSearchText}
      selPlatforms={selPlatforms}
      selFormats={selFormats}
      onTogglePlatform={(k) => toggle(setSelPlatforms, k)}
      onToggleFormat={(k) => toggle(setSelFormats, k)}
      activeCount={activeCount}
      onClear={clearFilters}
    />
  );

  return (
    <div className="min-h-screen">
      <SiteNav active="browse" showRightLinks={false} />
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-[240px] shrink-0 lg:block">
          {filtersPanel}
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Mobile filter trigger */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-surface-2 px-3 py-1.5 text-xs text-text-secondary lg:hidden"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M6 12h12M10 18h4" />
                </svg>
                {t("browse.filters")}
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-on-primary">
                    {activeCount}
                  </span>
                )}
              </button>
              <div className="flex rounded-xl border border-white/5 bg-surface-2 p-0.5">
                {(["grid","waterfall","list"] as const).map(v => (
                  <button key={v} onClick={() => setViewMode(v)} className={viewMode === v ? "rounded-lg bg-surface-4 px-3 py-1.5 text-xs font-medium text-text-primary" : "rounded-lg px-3 py-1.5 text-xs font-medium text-text-tertiary hover:text-text-secondary"}>
                    {t(`browse.view.${v}`)}
                  </button>
                ))}
              </div>
            </div>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "newest" | "oldest")} className="rounded-xl border border-white/5 bg-surface-2 px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary/30">
              <option value="newest">{t("browse.sort.newest")}</option>
              <option value="oldest">{t("browse.sort.oldest")}</option>
            </select>
          </div>

          {loading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">{Array.from({length:15}).map((_,i)=>(<div key={i} className="card-md3"><div className="skeleton" style={{aspectRatio:"2/3"}}/><div className="space-y-2 p-2.5"><div className="skeleton h-3 w-3/4 rounded"/><div className="skeleton h-2 w-1/3 rounded"/></div></div>))}</div>}
          {error && <div className="glass rounded-2xl p-8 text-center"><p className="text-error text-sm">{error}</p><button onClick={() => window.location.reload()} className="mt-3 text-xs text-primary hover:underline">Retry</button></div>}
          {!loading && !error && filtered.length === 0 && <div className="glass rounded-2xl p-8 text-center"><p className="text-text-secondary">{t("browse.noMatches")}</p></div>}

          {!loading && filtered.length > 0 && viewMode !== "list" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
                {filtered.map((post, i) => (
                  <Link key={post.id + "-" + i} href={"/" + post.service + "/user/" + post.user + "/post/" + post.id} className="card-md3 group flex flex-col">
                    <div className="relative overflow-hidden bg-surface-3">
                      <img src={thumb(post)} alt={post.title} className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105" loading="lazy" style={{aspectRatio:"2/3"}} />
                      <div className="absolute bottom-0 left-0 right-0 h-1" style={{backgroundColor:color(post.service)}} />
                      <div className="absolute left-2 top-2"><span className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{color:color(post.service)}}>{label(post.service)}</span></div>
                    </div>
                    <div className="flex flex-col gap-1 p-2.5">
                      <h3 className="line-clamp-2 text-[11px] font-medium leading-snug sm:text-xs">{post.title || "Untitled"}</h3>
                      <p className="text-[10px] text-text-tertiary">{formatRelativeDate(post.published)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {hasMore && filtered.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <button onClick={loadMore} disabled={loadingMore} className="rounded-xl bg-surface-2 px-6 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-3 hover:text-text-primary disabled:opacity-50">
                    {loadingMore ? t("common.loading") : t("common.loadMore")}
                  </button>
                </div>
              )}
              {!hasMore && filtered.length > 0 && (
                <p className="mt-6 text-center text-xs text-text-tertiary">{t("browse.allLoaded")}</p>
              )}
            </>
          )}

          {!loading && filtered.length > 0 && viewMode === "list" && (
            <>
              <div className="space-y-2">
                {filtered.map((post, i) => (
                  <Link key={post.id + "-" + i} href={"/" + post.service + "/user/" + post.user + "/post/" + post.id} className="flex gap-3 rounded-xl bg-surface-1 p-3 transition-colors hover:bg-surface-2">
                    <img src={thumb(post)} alt={post.title} className="h-14 w-14 shrink-0 rounded-lg bg-surface-3 object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">{post.title || "Untitled"}</h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{color:color(post.service)}}>{label(post.service)}</span>
                        <span className="text-[10px] text-text-tertiary">{formatRelativeDate(post.published)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button onClick={loadMore} disabled={loadingMore} className="rounded-xl bg-surface-2 px-6 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-3 hover:text-text-primary disabled:opacity-50">
                    {loadingMore ? t("common.loading") : t("common.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface-1 pb-6 shadow-2xl border-t border-white/10">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-surface-1/95 px-5 py-3 backdrop-blur-sm">
              <div className="flex flex-col">
                <p className="text-sm font-medium">{t("browse.filters")}</p>
                {activeCount > 0 && (
                  <span className="text-[10px] text-text-tertiary">{activeCount} active</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-primary hover:bg-surface-2"
              >
                {t("common.done")}
              </button>
            </div>
            <div className="p-5">{filtersPanel}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Filters body — shared between sidebar & drawer
// ============================================================
function FiltersBody({
  searchText,
  setSearchText,
  selPlatforms,
  selFormats,
  onTogglePlatform,
  onToggleFormat,
  activeCount,
  onClear,
}: {
  searchText: string;
  setSearchText: (v: string) => void;
  selPlatforms: Set<string>;
  selFormats: Set<string>;
  onTogglePlatform: (k: string) => void;
  onToggleFormat: (k: string) => void;
  activeCount: number;
  onClear: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder={t("browse.filters.searchTitle")}
        className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <details className="group" open>
        <summary className="mb-2 flex cursor-pointer items-center justify-between text-sm font-medium text-text-primary list-none">
          {t("browse.filters.platform")}<span className="text-text-tertiary transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="space-y-1">
          {FILTER_PLATFORMS.map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-2">
              <input
                type="checkbox"
                checked={selPlatforms.has(k)}
                onChange={() => onTogglePlatform(k)}
                className="h-4 w-4 rounded border-white/10 bg-surface-3 accent-primary"
              />
              <span className="flex-1 text-text-secondary capitalize">{k}</span>
            </label>
          ))}
        </div>
      </details>
      <details className="group">
        <summary className="mb-2 flex cursor-pointer items-center justify-between text-sm font-medium text-text-primary list-none">
          {t("browse.filters.fileFormat")}<span className="text-text-tertiary transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => onToggleFormat(f)}
              className={
                selFormats.has(f)
                  ? "rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-[11px] text-primary transition-all"
                  : "rounded-full border border-white/10 bg-surface-2 px-2.5 py-1 text-[11px] text-text-secondary transition-all hover:border-primary/30"
              }
            >
              {f}
            </button>
          ))}
        </div>
      </details>
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-text-secondary hover:bg-surface-2"
        >
          {t("common.clearFilters")}
        </button>
      )}
    </div>
  );
}
