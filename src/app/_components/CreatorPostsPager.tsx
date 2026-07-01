"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getCreatorPosts,
  getThumbnailUrl,
  getServiceColor,
} from "@/lib/api";
import type { Post } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

const PAGE_SIZE = 50;

interface Props {
  service: string;
  creatorId: string;
  initialPosts: Post[];
}

export function CreatorPostsPager({ service, creatorId, initialPosts }: Props) {
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [done, setDone] = useState(initialPosts.length < PAGE_SIZE);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = () => {
    if (pending || done) return;
    setErr(null);
    startTransition(async () => {
      try {
        const next = await getCreatorPosts(service, creatorId, { o: offset });
        if (next.length === 0) {
          setDone(true);
          return;
        }
        const seen = new Set(posts.map((p) => `${p.service}:${p.id}`));
        const deduped = next.filter((p) => !seen.has(`${p.service}:${p.id}`));
        if (deduped.length === 0) {
          setDone(true);
          return;
        }
        setPosts((prev) => [...prev, ...deduped]);
        setOffset(offset + PAGE_SIZE);
        if (next.length < PAGE_SIZE) setDone(true);
      } catch {
        setErr(t("browse.noMatches"));
      }
    });
  };

  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !pending) loadMore();
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, pending, offset]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
        {posts.map((post, i) => {
          const thumb = getThumbnailUrl(post);
          const color = getServiceColor(post.service);
          const animate = i < 24;
          return (
            <Link
              key={`${post.service}:${post.id}`}
              href={`/${post.service}/user/${post.user}/post/${post.id}`}
              className={`card-md3 group flex flex-col ${animate ? "fade-in-up" : ""}`}
              style={animate ? { animationDelay: `${i * 40}ms` } : undefined}
            >
              <div className="relative overflow-hidden bg-surface-3">
                <img
                  src={thumb}
                  alt={post.title}
                  className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                  loading="lazy"
                  style={{ aspectRatio: "3/4" }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div className="flex flex-col gap-1 p-2.5">
                <h3 className="line-clamp-2 text-xs font-medium leading-snug">
                  {post.title || t("post.untitled")}
                </h3>
                <p className="text-[10px] text-text-tertiary">
                  {formatRelativeDate(post.published)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-2" />

      <div className="mt-6 flex flex-col items-center gap-2">
        {err && <p className="text-xs text-error">{err}</p>}
        {done ? (
          posts.length > 0 && (
            <p className="text-xs text-text-tertiary">{t("browse.allLoaded")}</p>
          )
        ) : (
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-xl bg-surface-2 px-6 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-surface-3 hover:text-text-primary disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("common.loadMore")}
          </button>
        )}
      </div>
    </>
  );
}
