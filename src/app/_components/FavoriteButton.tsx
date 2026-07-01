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

type Kind = "post" | "creator";

interface Props {
  kind: Kind;
  service: string;
  creatorId: string;
  postId?: string;
  className?: string;
}

export function FavoriteButton({ kind, service, creatorId, postId, className }: Props) {
  const [authed, setAuthed] = useState(false);
  const [fav, setFav] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const session = getSessionCookie();
    setAuthed(!!session);
    if (!session) { setFav(false); return; }

    let cancelled = false;
    (async () => {
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
        if (!cancelled) {
          if (e instanceof AuthError) setAuthed(false);
          setFav(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [kind, service, creatorId, postId]);

  const toggle = () => {
    if (!authed || fav === null) return;
    setErr(null);
    const nowFav = !fav;
    setFav(nowFav);
    startTransition(async () => {
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
