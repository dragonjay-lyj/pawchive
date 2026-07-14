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

/** Supabase user_post converted to a shape compatible with Post cards. */
interface UserPostLike {
  _is_user: true;
  id: string;
  title: string;
  content: string;
  service: string;
  user: string;
  published: string;
  thumb_url: string | null;
  attachments: { name: string; url?: string }[];
}

function userPostToPost(p: UserPostLike): Post {
  return {
    id: p.id,
    user: p.user,
    service: p.service as Post["service"],
    title: p.title,
    content: p.content,
    substring: p.content?.slice(0, 200),
    embed: {},
    shared_file: false,
    added: p.published,
    published: p.published,
    edited: p.published,
    file: { name: p.title, path: p.thumb_url ?? "" },
    attachments: p.attachments?.map((a) => ({
      name: a.name,
      path: a.url ?? "",
    })) ?? [],
    preview_state: "pending",
  };
}

export function CreatorPostsPager({ service, creatorId, initialPosts }: Props) {
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [customPosts, setCustomPosts] = useState<Post[]>([]);
  const [customLoaded, setCustomLoaded] = useState(false);
  const [offset, setOffset] = useState(initialPosts.length);
  const [done, setDone] = useState(initialPosts.length < PAGE_SIZE);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load user-contributed posts from Supabase
  useEffect(() => {
    fetch(`/api/posts/public?service=${encodeURIComponent(service)}&creator_id=${encodeURIComponent(creatorId)}`)
      .then((res) => res.json())
      .then((json) => {
        const list: UserPostLike[] = json.posts ?? [];
        setCustomPosts(list.map(userPostToPost));
      })
      .catch(() => {})
      .finally(() => setCustomLoaded(true));
  }, [service, creatorId]);

  const allPosts = customLoaded ? [...customPosts, ...posts] : posts;

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
        {allPosts.map((post, i) => {
          const isCustom = (post as { _is_user?: boolean })._is_user;
          const thumb = getThumbnailUrl(post);
          const color = getServiceColor(post.service);
          const animate = i < 24;

          // Custom posts don't have an upstream detail page — link to manage
          const href = isCustom
            ? "/manage"
            : `/${post.service}/user/${post.user}/post/${post.id}`;

          return (
            <Link
              key={`${post.service}:${post.id}:${isCustom ? "u" : "a"}`}
              href={href}
              className={`card-md3 group flex flex-col ${animate ? "fade-in-up" : ""}`}
              style={animate ? { animationDelay: `${i * 40}ms` } : undefined}
            >
              <div className="relative overflow-hidden bg-surface-3">
                {thumb && thumb !== "/placeholder.jpg" ? (
                  <img
                    src={thumb}
                    alt={post.title}
                    className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                    loading="lazy"
                    style={{ aspectRatio: "3/4" }}
                  />
                ) : (
                  <div className="flex items-center justify-center bg-surface-2" style={{ aspectRatio: "3/4" }}>
                    <span className="text-text-tertiary text-xs">📄</span>
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: color }}
                />
                {isCustom && (
                  <span className="absolute top-2 right-2 rounded-md bg-primary/30 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    ⭐
                  </span>
                )}
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
          allPosts.length > 0 && (
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
