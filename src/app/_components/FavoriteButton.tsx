"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  addFavoritePost,
  removeFavoritePost,
  addFavoriteCreator,
  removeFavoriteCreator,
  getAccountFavorites,
  getSessionCookie,
  AuthError,
} from "@/lib/api";
import { useAuth } from "@/lib/supabase/auth-provider";

type Kind = "post" | "creator";

interface Props {
  kind: Kind;
  service: string;
  creatorId: string;
  postId?: string;
  title?: string;
  creatorName?: string;
  thumbUrl?: string;
  className?: string;
}

export function FavoriteButton({
  kind, service, creatorId, postId, title, creatorName, thumbUrl, className,
}: Props) {
  const { user } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [fav, setFav] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Check Supabase + upstream auth
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const session = getSessionCookie();
      const isAuthed = !!user || !!session;
      if (cancelled) return;
      setAuthed(isAuthed);
      if (!isAuthed) { setFav(false); return; }
      setFav(null);

      // Try Supabase first
      if (user) {
        try {
          const res = await fetch(`/api/favorites?type=${kind === "post" ? "post" : "creator"}`);
          if (res.ok) {
            const json = await res.json();
            const match = json.favorites?.some((f: { service: string; creator_id: string; post_id: string | null }) => {
              if (f.service !== service) return false;
              if (f.creator_id !== creatorId) return false;
              if (kind === "post") return f.post_id === postId;
              return true;
            });
            if (!cancelled) setFav(!!match);
            return;
          }
        } catch { /* fall through to upstream */ }
      }

      // Fallback to upstream API
      try {
        const list = await getAccountFavorites(kind === "post" ? "post" : "artist");
        if (cancelled) return;
        const match = list.some((f) => {
          if (f.service !== service) return false;
          if (kind === "creator") return f.id === creatorId;
          return f.id === postId;
        });
        setFav(match);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof AuthError) setAuthed(false);
        setFav(false);
      }
    };

    void load();

    const onSessionChange = () => { void load(); };
    window.addEventListener("pawchive:session-change", onSessionChange);
    return () => {
      cancelled = true;
      window.removeEventListener("pawchive:session-change", onSessionChange);
    };
  }, [kind, service, creatorId, postId, user]);

  const toggle = () => {
    if (!authed || fav === null) return;
    setErr(null);
    const nowFav = !fav;
    setFav(nowFav);
    startTransition(async () => {
      // Always try Supabase if logged in
      if (user) {
        try {
          if (nowFav) {
            await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: kind === "post" ? "post" : "creator",
                service,
                creator_id: creatorId,
                post_id: postId ?? null,
                title,
                creator_name: creatorName,
                thumb_url: thumbUrl,
              }),
            });
          } else {
            // Find the fav id from Supabase and delete
            const res = await fetch(`/api/favorites?type=${kind === "post" ? "post" : "creator"}`);
            if (res.ok) {
              const json = await res.json();
              const match = json.favorites?.find((f: { service: string; creator_id: string; post_id: string | null; id: string }) => {
                if (f.service !== service) return false;
                if (f.creator_id !== creatorId) return false;
                if (kind === "post") return f.post_id === postId;
                return true;
              });
              if (match) {
                await fetch(`/api/favorites?id=${match.id}`, { method: "DELETE" });
              }
            }
          }
          return; // Done — Supabase handles it
        } catch { /* fall through to upstream */ }
      }

      // Fallback to upstream API
      try {
        if (kind === "post") {
          if (!postId) throw new Error("Missing postId");
          if (nowFav) await addFavoritePost(service, creatorId, postId);
          else await removeFavoritePost(service, creatorId, postId);
        } else {
          if (nowFav) await addFavoriteCreator(service, creatorId);
          else await removeFavoriteCreator(service, creatorId);
        }
      } catch (e) {
        setFav(!nowFav);
        if (e instanceof AuthError) {
          setAuthed(false);
          setErr("Session expired — reconnect in Settings.");
        } else {
          setErr("Failed. Try again.");
        }
      }
    });
  };

  if (!authed) {
    return (
      <Link
        href="/settings#account"
        className={className ?? "neo-badge inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"}
        title="Sign in to favorite"
      >
        <span>♡</span>
        <span>Sign in to favorite</span>
      </Link>
    );
  }

  const label = kind === "post"
    ? (fav ? "Favorited" : "Favorite")
    : (fav ? "Following" : "Follow");

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending || fav === null}
        aria-pressed={!!fav}
        className={
          className ??
          `neo-badge inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-60 ${
            fav
              ? "bg-primary text-on-primary"
              : "text-text-primary hover:bg-surface-2"
          }`
        }
      >
        <span className="text-sm leading-none">{fav ? "♥" : "♡"}</span>
        <span>{pending ? "…" : label}</span>
      </button>
      {err && <span className="text-[10px] text-error">{err}</span>}
    </div>
  );
}
