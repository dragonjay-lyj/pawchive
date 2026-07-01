"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  getRecentPosts,
  getThumbnailUrl,
  getServiceColor,
} from "@/lib/api";
import type { Post } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

const PAGE_SIZE = 50;

interface Props {
  initialPosts: Post[];
}

export function PostFeed({ initialPosts }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [done, setDone] = useState(initialPosts.length < PAGE_SIZE);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMore = () => {
    if (pending || done) return;
    setErr(null);
    startTransition(async () => {
      try {
        const next = await getRecentPosts({ o: offset });
        if (next.length === 0) {
          setDone(true);
          return;
        }
        const seen = new Set(posts.map((p) => `${p.service}:${p.id}`));
        const deduped = next.filter((p) => !seen.has(`${p.service}:${p.id}`));
        setPosts((prev) => [...prev, ...deduped]);
        setOffset(offset + PAGE_SIZE);
        if (next.length < PAGE_SIZE) setDone(true);
      } catch {
        setErr("Failed to load more posts.");
      }
    });
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
        {posts.map((post, i) => (
          <PostCard key={`${post.service}:${post.id}`} post={post} index={i} />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        {err && <p className="text-xs text-error">{err}</p>}
        {done ? (
          <p className="text-xs text-text-tertiary">— End of feed —</p>
        ) : (
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="neo-badge rounded-xl px-6 py-2.5 text-sm font-semibold text-text-primary transition-all hover:bg-surface-2 disabled:opacity-60"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const thumb = getThumbnailUrl(post);
  const serviceColor = getServiceColor(post.service);
  const animate = index < 24;
  return (
    <Link
      href={`/${post.service}/user/${post.user}/post/${post.id}`}
      className={`card-md3 group flex flex-col ${animate ? "fade-in-up" : ""}`}
      style={animate ? { animationDelay: `${index * 40}ms` } : undefined}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-3">
        <img
          src={thumb}
          alt={post.title}
          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
          loading="lazy"
        />
        <div className="absolute left-2 top-2">
          <span
            className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold capitalize"
            style={{ color: serviceColor }}
          >
            {post.service}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-xs font-medium leading-snug sm:text-sm">
          {post.title || "Untitled"}
        </h3>
        <p className="mt-auto text-[10px] text-text-tertiary sm:text-xs">
          {formatRelativeDate(post.published)}
        </p>
      </div>
    </Link>
  );
}
