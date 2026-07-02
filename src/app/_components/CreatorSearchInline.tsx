"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getAllCreators, getServiceColor, getServiceLabel, getCreatorAvatarUrl } from "@/lib/api";
import type { Creator, ServiceType } from "@/lib/types";
import { SafeImage } from "./SafeImage";

const PLATFORMS: ServiceType[] = [
  "patreon", "fanbox", "fantia", "subscribestar", "discord", "gumroad", "boosty", "afdian",
];

const VISIBLE = 40;

export function CreatorSearchInline() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<ServiceType>>(new Set());
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllCreators();
        if (!cancelled) setCreators(data);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load creator index.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = creators;
    if (needle) list = list.filter((c) => c.name?.toLowerCase().includes(needle));
    if (sel.size > 0) list = list.filter((c) => sel.has(c.service));
    return [...list].sort((a, b) => b.favorited - a.favorited);
  }, [creators, q, sel]);

  const shown = showMore ? results : results.slice(0, VISIBLE);
  const total = results.length;

  const togglePlatform = (p: ServiceType) => {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p); else n.add(p);
      return n;
    });
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong flex items-center gap-3 rounded-2xl px-4">
        <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setShowMore(false); }}
          placeholder="Search creators by name…"
          className="w-full bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          autoFocus
        />
        {q && (
          <button onClick={() => setQ("")} className="text-text-tertiary hover:text-text-primary">
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const active = sel.has(p);
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
      </div>

      {loading && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-text-tertiary">
          Loading creator index…
        </div>
      )}

      {err && (
        <div className="glass rounded-2xl p-4 text-sm text-error text-center">{err}</div>
      )}

      {!loading && !err && (
        <>
          <p className="text-[11px] text-text-tertiary">
            {total.toLocaleString("en-US")} creator{total === 1 ? "" : "s"}
            {creators.length !== total && (
              <span> of {creators.length.toLocaleString("en-US")} indexed</span>
            )}
            {" · sorted by favorites"}
          </p>

          {shown.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-sm text-text-secondary">
              No creators match{q ? ` "${q}"` : ""}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          )}

          {!showMore && total > VISIBLE && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowMore(true)}
                className="rounded-xl bg-surface-2 px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              >
                Show all {total.toLocaleString("en-US")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
