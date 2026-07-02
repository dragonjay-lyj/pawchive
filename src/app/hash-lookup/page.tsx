"use client";

import { useState } from "react";
import Link from "next/link";
import { searchFileByHash, getThumbUrl, getServiceColor, getServiceLabel } from "@/lib/api";
import type { FileHashResult } from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/utils";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";

// ============================================================
// Hash Search Page — Lookup file by SHA-256
// ============================================================

export default function HashSearchPage() {
  const { t } = useI18n();
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<FileHashResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = async () => {
    const trimmed = hash.trim();
    if (!trimmed) return;
    if (!/^[a-fA-F0-9]{64}$/.test(trimmed)) {
      setError(t("hash.invalid"));
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await searchFileByHash(trimmed);
      setResult(data);
    } catch {
      setError(t("hash.notFound"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteNav />

      <main className="mx-auto max-w-[960px] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="pt-12">
          <h1 className="font-display text-3xl font-bold mb-2">{t("hash.title")}</h1>
          <p className="text-sm text-text-secondary mb-8">
            {t("hash.subtitle")}
          </p>

          {/* Search input */}
          <div className="glass-strong relative rounded-2xl p-1 mb-6">
            <div className="flex items-center gap-3 px-4">
              <svg className="h-5 w-5 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder={t("hash.placeholder")}
                className="glass-focus w-full bg-transparent py-3 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none"
                autoFocus
              />
              <button
                onClick={doSearch}
                disabled={loading}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "…" : t("hash.lookup")}
              </button>
            </div>
          </div>

          {error && (
            <div className="glass rounded-2xl p-4 text-center text-sm text-error mb-6">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* File info */}
              <div className="glass rounded-2xl p-5">
                <h2 className="font-display text-lg mb-4">{t("hash.fileInfo")}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "MIME", value: result.mime },
                    { label: "Extension", value: result.ext },
                    { label: "Size", value: formatFileSize(result.size) },
                    { label: "Added", value: formatDate(result.added) },
                  ].map((row) => (
                    <div key={row.label}>
                      <p className="text-xs text-text-tertiary">{row.label}</p>
                      <p className="text-sm font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>
                {result.mime?.startsWith("image/") && (
                  <img
                    src={getThumbUrl(`/${result.hash.slice(0, 2)}/${result.hash.slice(0, 4)}/${result.hash}`)}
                    alt="Preview"
                    className="mt-4 rounded-xl max-h-64 w-auto object-contain bg-surface-2"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Associated posts */}
              {result.posts.length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <h2 className="font-display text-lg mb-4">
                    {t("hash.foundInPosts", { count: result.posts.length })}
                  </h2>
                  <div className="space-y-2">
                    {result.posts.map((post) => {
                      const color = getServiceColor(post.service);
                      return (
                        <Link
                          key={`${post.id}-${post.file_id}`}
                          href={`/${post.service}/user/${post.user}/post/${post.id}`}
                          className="flex gap-3 rounded-xl bg-surface-1 p-3 transition-colors hover:bg-surface-2"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                            <img
                              src={getThumbUrl(post.file.path)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-medium">{post.title}</h3>
                            <p className="line-clamp-1 text-xs text-text-tertiary mt-0.5">{post.substring}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="neo-badge inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{color}}>
                                {getServiceLabel(post.service)}
                              </span>
                              <span className="text-[10px] text-text-tertiary">{formatDate(post.published)}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Discord posts */}
              {result.discord_posts.length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <h2 className="font-display text-lg mb-4">
                    {t("hash.foundInDiscord", { count: result.discord_posts.length })}
                  </h2>
                  <div className="space-y-2">
                    {result.discord_posts.map((dp, i) => (
                      <div key={i} className="rounded-xl bg-surface-1 p-3">
                        <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                          <span>Server: {dp.server}</span>
                          <span>Channel: {dp.channel}</span>
                          <span>{formatDate(dp.published)}</span>
                        </div>
                        {dp.substring && (
                          <p className="mt-1 text-xs text-text-secondary">{dp.substring}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
