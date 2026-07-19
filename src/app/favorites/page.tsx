"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  getAccountFavorites,
  getServiceColor,
  getServiceLabel,
  getSessionCookie,
  removeFavoriteCreator,
  removeFavoritePost,
  AuthError,
} from "@/lib/api";
import type { FavoriteCreator } from "@/lib/types";
import {
  listCollections,
  createCollection,
  deleteCollection,
  renameCollection,
  updateCollectionStyle,
  addItemToCollection,
  removeItemFromCollection,
  collectionsContaining,
  reorderCollections,
  type Collection,
  type FavoriteRef,
} from "@/lib/collections";
import { SiteNav } from "@/app/_components/SiteNav";
import { useI18n } from "@/lib/i18n/provider";
import { useAuth } from "@/lib/supabase/auth-provider";

/** Map a Supabase favorite row to the FavoriteCreator shape used in the UI. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseFav(f: any): FavoriteCreator & { _supabase_id: string } {
  return {
    faved_seq: 0,
    id: f.creator_id,
    service: f.service,
    name: f.creator_name ?? "",
    title: f.title ?? undefined,
    indexed: f.created_at,
    updated: f.created_at,
    last_imported: f.created_at,
    user: f.creator_id,
    creator_id: f.creator_id,
    _supabase_id: f.id,
  };
}

export default function FavoritesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [artists, setArtists] = useState<FavoriteCreator[]>([]);
  const [posts, setPosts] = useState<FavoriteCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "updated">("newest");

  useEffect(() => {
    setCollections(listCollections());
    const onChange = () => setCollections(listCollections());
    window.addEventListener("pawchive:collections-change", onChange);
    return () => window.removeEventListener("pawchive:collections-change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const session = getSessionCookie();
      const isAuthed = !!user || !!session;
      if (cancelled) return;
      setAuthed(isAuthed);
      setError(null);
      if (!isAuthed) {
        setArtists([]);
        setPosts([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      // Try Supabase first
      if (user) {
        try {
          const [aRes, pRes] = await Promise.allSettled([
            fetch("/api/favorites?type=creator"),
            fetch("/api/favorites?type=post"),
          ]);
          if (cancelled) return;

          if (aRes.status === "fulfilled" && aRes.value.ok) {
            const json = await aRes.value.json();
            setArtists(json.favorites.map(mapSupabaseFav));
          } else {
            setArtists([]);
          }

          if (pRes.status === "fulfilled" && pRes.value.ok) {
            const json = await pRes.value.json();
            setPosts(json.favorites.map(mapSupabaseFav));
          } else {
            setPosts([]);
          }

          setLoading(false);
          return;
        } catch { /* fall through to upstream */ }
      }

      // Fallback to upstream API (pawchive session)
      try {
        const [a, p] = await Promise.allSettled([
          getAccountFavorites("artist"),
          getAccountFavorites("post"),
        ]);
        if (cancelled) return;
        if (a.status === "fulfilled") setArtists(a.value); else setArtists([]);
        if (p.status === "fulfilled") setPosts(p.value); else setPosts([]);
        if (a.status === "rejected" && p.status === "rejected") {
          setError("Unable to load favorites. Check your session in Settings.");
        }
      } catch {
        if (!cancelled) setError("Failed to load favorites.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const onSessionChange = () => { void load(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pawchive_session") void load();
    };
    window.addEventListener("pawchive:session-change", onSessionChange);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("pawchive:session-change", onSessionChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [user]);

  return (
    <div className="min-h-screen">
      <SiteNav active="favorites" />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("fav.title")}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {authed ? t("fav.subtitle.connected") : t("fav.subtitle.disconnected")}
            </p>
          </div>
          <Link href="/settings" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-text-secondary transition-all hover:bg-surface-2">{t("nav.settings")}</Link>
        </div>

        {!authed && (
          <div className="glass rounded-2xl p-8 text-center sm:p-12">
            <p className="text-5xl">🔐</p>
            <h2 className="mt-4 text-xl font-bold">{t("fav.disconnected.title")}</h2>
            <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
              {t("fav.disconnected.body")}
            </p>
            <Link href="/settings#account" className="mt-4 inline-block text-primary hover:underline text-xs">
              {t("nav.settings")} →
            </Link>
          </div>
        )}

        {authed && loading && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({length:8}).map((_,i)=>(<div key={i} className="flex items-center gap-3 rounded-xl bg-surface-1 p-3"><div className="skeleton h-10 w-10 rounded-full"/><div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-24 rounded"/><div className="skeleton h-2 w-16 rounded"/></div></div>))}
          </div>
        )}

        {authed && error && <div className="glass rounded-2xl p-8 text-center"><p className="text-error text-sm">{error}</p></div>}

        {authed && !loading && !error && (
          <>
            {/* Bento — user-defined collections */}
            {/* Sort toggle */}
            <div className="mb-6 flex items-center gap-2">
              <span className="text-xs text-text-tertiary">Sort:</span>
              <button
                onClick={() => setSortOrder("newest")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${sortOrder === "newest" ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"}`}
              >
                Added
              </button>
              <button
                onClick={() => setSortOrder("updated")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${sortOrder === "updated" ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"}`}
              >
                Updated
              </button>
            </div>

            {(() => {
              const displayArtists = sortOrder === "updated"
                ? [...artists].sort((a, b) => new Date((b.updated || b.last_imported || b.indexed)).getTime() - new Date((a.updated || a.last_imported || a.indexed)).getTime())
                : artists;
              const displayPosts = sortOrder === "updated"
                ? [...posts].sort((a, b) => new Date((b.updated || b.last_imported || b.indexed)).getTime() - new Date((a.updated || a.last_imported || a.indexed)).getTime())
                : posts;
              return (
                <>
            <CollectionsBento
              collections={collections}
              artists={displayArtists}
              posts={displayPosts}
            />

            {/* Favorite Creators */}
            <section className="mb-10">
              <h2 className="mb-4 font-display text-xl">{t("fav.creators", { count: displayArtists.length })}</h2>
              {displayArtists.length === 0 ? (
                <div className="glass rounded-2xl p-6 text-center"><p className="text-sm text-text-secondary">{t("fav.creators.none")}</p></div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {displayArtists.map(fav => (
                    <ArtistCard
                      key={fav.service + ":" + fav.id}
                      fav={fav}
                      onRemoved={() => setArtists(a => a.filter(x => !(x.service === fav.service && x.id === fav.id)))}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Favorite Posts */}
            <section>
              <h2 className="mb-4 font-display text-xl">{t("fav.posts", { count: displayPosts.length })}</h2>
              {displayPosts.length === 0 ? (
                <div className="glass rounded-2xl p-6 text-center"><p className="text-sm text-text-secondary">{t("fav.posts.none")}</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
                  {displayPosts.map(fav => (
                    <PostFavCard
                      key={fav.service + ":" + fav.id + ":" + fav.faved_seq}
                      fav={fav}
                      onRemoved={() => setPosts(p => p.filter(x => !(x.service === fav.service && x.id === fav.id && x.faved_seq === fav.faved_seq)))}
                    />
                  ))}
                </div>
              )}
            </section>
                </>
              );
            })()}

          </>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Artist / Post favorite cards with remove button
// ============================================================
function ArtistCard({ fav, onRemoved }: { fav: FavoriteCreator; onRemoved: () => void }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const color = getServiceColor(fav.service);
  const ref: FavoriteRef = { kind: "creator", service: fav.service, id: fav.id };

  const remove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    if (!confirm(t("fav.confirmRemoveCreator", { name: fav.name }))) return;
    setErr(null);
    startTransition(async () => {
      try {
        const sid = (fav as { _supabase_id?: string })._supabase_id;
        if (sid) {
          await fetch(`/api/favorites?id=${sid}`, { method: "DELETE" });
        } else {
          await removeFavoriteCreator(fav.service, fav.id);
        }
        onRemoved();
      } catch (e) {
        setErr(e instanceof AuthError ? "Session expired." : "Failed.");
      }
    });
  };

  return (
    <div className="group relative">
      <Link
        href={"/" + fav.service + "/user/" + fav.id}
        className="flex items-center gap-3 rounded-xl bg-surface-1 p-3 transition-all hover:bg-surface-2"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: color + "20", color }}
        >
          {fav.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fav.name}</p>
          <span className="text-[10px] text-text-tertiary">{getServiceLabel(fav.service)}</span>
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTagMenu((v) => !v); }}
          aria-label="Add to collection"
          title="Add to collection"
          className="rounded-md bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-text-tertiary backdrop-blur-sm transition-all hover:bg-primary/20 hover:text-primary"
        >
          #
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={t("action.remove")}
          title={t("action.remove")}
          className="rounded-md bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-text-tertiary backdrop-blur-sm transition-all hover:bg-error/20 hover:text-error disabled:opacity-40"
        >
          {pending ? "…" : "✕"}
        </button>
      </div>
      {showTagMenu && (
        <TagMenu itemRef={ref} onClose={() => setShowTagMenu(false)} />
      )}
      {err && <p className="mt-1 text-[10px] text-error">{err}</p>}
    </div>
  );
}

function PostFavCard({ fav, onRemoved }: { fav: FavoriteCreator; onRemoved: () => void }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const color = getServiceColor(fav.service);
  const creatorId = fav.user ?? fav.creator_id;
  const postId = fav.id;
  const ref: FavoriteRef | null = creatorId
    ? { kind: "post", service: fav.service, creatorId, postId }
    : null;
  const href = creatorId
    ? `/${fav.service}/user/${creatorId}/post/${postId}`
    : `/${fav.service}/user/${postId}`;

  const remove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending || !creatorId) return;
    if (!confirm(t("fav.confirmRemovePost", { name: fav.title ?? fav.name }))) return;
    setErr(null);
    startTransition(async () => {
      try {
        const sid = (fav as { _supabase_id?: string })._supabase_id;
        if (sid) {
          await fetch(`/api/favorites?id=${sid}`, { method: "DELETE" });
        } else {
          await removeFavoritePost(fav.service, creatorId, postId);
        }
        onRemoved();
      } catch (e) {
        setErr(e instanceof AuthError ? "Session expired." : "Failed.");
      }
    });
  };

  return (
    <div className="group relative">
      <Link href={href} className="card-md3 flex flex-col">
        <div className="flex aspect-[3/4] flex-col items-center justify-center bg-surface-2 p-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
            style={{ backgroundColor: color + "20", color }}
          >
            {(fav.title ?? fav.name).slice(0, 2).toUpperCase()}
          </div>
          <p className="mt-3 text-center text-xs font-medium line-clamp-2">
            {fav.title ?? fav.name}
          </p>
          <span className="mt-1 text-[10px] text-text-tertiary">
            {getServiceLabel(fav.service)}
          </span>
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {ref && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTagMenu((v) => !v); }}
            aria-label="Add to collection"
            title="Add to collection"
            className="rounded-md bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-text-tertiary backdrop-blur-sm transition-all hover:bg-primary/20 hover:text-primary"
          >
            #
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending || !creatorId}
          aria-label={t("action.remove")}
          title={t("action.remove")}
          className="rounded-md bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-text-tertiary backdrop-blur-sm transition-all hover:bg-error/20 hover:text-error disabled:opacity-40"
        >
          {pending ? "…" : "✕"}
        </button>
      </div>
      {ref && showTagMenu && (
        <TagMenu itemRef={ref} onClose={() => setShowTagMenu(false)} />
      )}
      {err && <p className="mt-1 text-[10px] text-error">{err}</p>}
    </div>
  );
}

// ============================================================
// Collections Bento — user-defined groups
// ============================================================
function CollectionsBento({
  collections,
  artists,
  posts,
}: {
  collections: Collection[];
  artists: FavoriteCreator[];
  posts: FavoriteCreator[];
}) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  };
  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== overId) setOverId(id);
  };
  const handleDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === id) { setDragId(null); setOverId(null); return; }
    const order = collections.map((c) => c.id);
    const fromIdx = order.indexOf(dragId);
    const toIdx = order.indexOf(id);
    if (fromIdx < 0 || toIdx < 0) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragId);
    reorderCollections(order);
    setDragId(null);
    setOverId(null);
  };
  const handleDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  const artistMap = useMemo(() => {
    const m = new Map<string, FavoriteCreator>();
    for (const a of artists) m.set(`${a.service}:${a.id}`, a);
    return m;
  }, [artists]);
  const postMap = useMemo(() => {
    const m = new Map<string, FavoriteCreator>();
    for (const p of posts) m.set(`${p.service}:${p.id}`, p);
    return m;
  }, [posts]);

  const submitCreate = () => {
    const n = newName.trim();
    if (!n) return;
    createCollection(n);
    setNewName("");
    setCreating(false);
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">{t("fav.collections")}</h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="neo-badge rounded-lg px-3 py-1.5 text-xs font-bold text-primary"
          >
            {t("fav.collections.new")}
          </button>
        )}
      </div>

      {creating && (
        <div className="glass mb-4 flex items-center gap-2 rounded-xl p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder={t("fav.collections.namePlaceholder")}
            className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={submitCreate}
            disabled={!newName.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-40"
          >
            {t("fav.collections.create")}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(""); }}
            className="rounded-lg px-3 py-2 text-xs text-text-tertiary hover:text-text-primary"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-text-secondary">
          {t("fav.collections.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => {
            const previews = c.items.slice(0, 4).map((it) => {
              if (it.kind === "creator") {
                const key = `${it.service}:${it.id}`;
                return artistMap.get(key);
              }
              const key = `${it.service}:${it.postId}`;
              return postMap.get(key);
            });
            const isDragging = dragId === c.id;
            const isOver = overId === c.id && dragId && dragId !== c.id;
            return (
              <div
                key={c.id}
                draggable
                onDragStart={handleDragStart(c.id)}
                onDragOver={handleDragOver(c.id)}
                onDrop={handleDrop(c.id)}
                onDragEnd={handleDragEnd}
                className={
                  "bento p-4 relative overflow-hidden cursor-grab transition-all " +
                  (isDragging ? "opacity-40 " : "") +
                  (isOver ? "ring-2 ring-primary/60 " : "")
                }
                style={{ background: `linear-gradient(135deg, ${c.color}20, transparent), var(--color-surface-1)` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => { if (editName.trim()) renameCollection(c.id, editName); setEditingId(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { if (editName.trim()) renameCollection(c.id, editName); setEditingId(null); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded-md bg-surface-2 px-2 py-1 text-sm font-bold text-text-primary focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingId(c.id); setEditName(c.name); }}
                        className="text-left"
                      >
                        <p className="font-display text-base font-bold truncate">
                          {c.emoji && <span className="mr-1">{c.emoji}</span>}
                          {c.name}
                        </p>
                        <p className="text-[10px] text-text-tertiary">
                          {c.items.length === 1
                            ? t("fav.collections.item", { count: c.items.length })
                            : t("fav.collections.items", { count: c.items.length })}
                        </p>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStyleId(styleId === c.id ? null : c.id)}
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
                      aria-label="Edit style"
                      title="Edit style"
                    >
                      🎨
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(t("fav.collections.deleteConfirm", { name: c.name }))) {
                          deleteCollection(c.id);
                        }
                      }}
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-text-tertiary hover:bg-error/20 hover:text-error"
                      aria-label="Delete collection"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {styleId === c.id && (
                  <CollectionStyleEditor
                    collection={c}
                    onClose={() => setStyleId(null)}
                  />
                )}

                {/* Custom cover → falls back to preview grid → empty message */}
                {c.cover ? (
                  <div className="mt-3 h-24 w-full overflow-hidden rounded-md border border-white/5 bg-surface-2">
                    <img src={c.cover} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : previews.length > 0 ? (
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {previews.map((p, i) => {
                      if (!p) {
                        return (
                          <div
                            key={i}
                            className="aspect-square rounded-md bg-surface-2 flex items-center justify-center text-[10px] text-text-tertiary"
                          >
                            ?
                          </div>
                        );
                      }
                      const col = getServiceColor(p.service);
                      return (
                        <div
                          key={i}
                          className="aspect-square rounded-md flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: col + "30", color: col }}
                        >
                          {(p.name || "??").slice(0, 2).toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-[11px] text-text-tertiary">
                    {t("fav.collections.emptyGroup")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Tag menu — assign item to collection(s)
// ============================================================
function TagMenu({ itemRef, onClose }: { itemRef: FavoriteRef; onClose: () => void }) {
  const { t } = useI18n();
  const [cols, setCols] = useState<Collection[]>(() => listCollections());
  const [membership, setMembership] = useState<Set<string>>(() => new Set(collectionsContaining(itemRef)));
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = document.getElementById("tag-menu-root");
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const toggle = (id: string) => {
    if (membership.has(id)) {
      removeItemFromCollection(id, itemRef);
      setMembership((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      addItemToCollection(id, itemRef);
      setMembership((s) => new Set(s).add(id));
    }
  };

  const submitNew = () => {
    const n = newName.trim();
    if (!n) return;
    const c = createCollection(n);
    addItemToCollection(c.id, itemRef);
    setCols(listCollections());
    setMembership((s) => new Set(s).add(c.id));
    setNewName("");
  };

  return (
    <div
      id="tag-menu-root"
      onClick={(e) => e.stopPropagation()}
      className="glass-strong absolute right-2 top-8 z-20 w-56 rounded-xl border border-white/10 p-3 shadow-xl"
    >
      <p className="mb-2 text-[10px] uppercase tracking-widest text-text-tertiary">{t("fav.tag.title")}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {cols.length === 0 ? (
          <p className="text-xs text-text-tertiary">{t("fav.tag.none")}</p>
        ) : (
          cols.map((c) => {
            const active = membership.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={
                  "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors " +
                  (active ? "bg-primary/20 text-primary" : "text-text-secondary hover:bg-surface-2")
                }
              >
                <span className="truncate">
                  {c.emoji && <span className="mr-1">{c.emoji}</span>}
                  {c.name}
                </span>
                <span className="text-[10px]">{active ? "✓" : "+"}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="mt-3 flex gap-1 border-t border-white/5 pt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNew()}
          placeholder={t("fav.tag.new")}
          className="flex-1 rounded-md bg-surface-2 px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
        <button
          type="button"
          onClick={submitNew}
          disabled={!newName.trim()}
          className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-on-primary disabled:opacity-40"
        >
          {t("fav.tag.add")}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Bento style editor — emoji + color
// ============================================================
const EMOJI_PRESETS = ["🎨", "⭐", "🔥", "💎", "🌸", "🎯", "🌊", "🌙", "☀️", "🌈", "🎭", "🎬", "📚", "🍿", "🚀", "🌿", "🎮", "🎧"];
const COLOR_PRESETS = ["#D0BCFF", "#FF6FB5", "#4A90D9", "#35C759", "#FF424D", "#F59E0B", "#a78bfa", "#22d3ee", "#f472b6"];

function CollectionStyleEditor({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const [emoji, setEmoji] = useState<string>(collection.emoji ?? "");
  const [color, setColor] = useState<string>(collection.color);
  const [coverUrl, setCoverUrl] = useState<string>(collection.cover ?? "");
  const [coverErr, setCoverErr] = useState<string | null>(null);

  const commit = (patch: { emoji?: string | null; color?: string; cover?: string | null }) => {
    updateCollectionStyle(collection.id, patch);
  };

  const onUpload = (file: File | null) => {
    setCoverErr(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) { setCoverErr("Not an image."); return; }
    if (file.size > 500 * 1024) { setCoverErr("Image too large (max 500 KB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setCoverUrl(data);
      commit({ cover: data });
    };
    reader.onerror = () => setCoverErr("Failed to read file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-surface-2/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Style</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-1.5 text-[10px] text-text-tertiary hover:text-text-primary"
        >
          ✕
        </button>
      </div>

      {/* Emoji */}
      <p className="text-[10px] text-text-tertiary mb-1">Emoji</p>
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => { setEmoji(e); commit({ emoji: e }); }}
            className={
              "h-7 w-7 rounded-md text-sm transition-all " +
              (emoji === e ? "bg-primary/30 ring-1 ring-primary" : "bg-surface-3 hover:bg-surface-4")
            }
          >
            {e}
          </button>
        ))}
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          onBlur={() => commit({ emoji: emoji || null })}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commit({ emoji: emoji || null }); (e.target as HTMLInputElement).blur(); }
          }}
          maxLength={4}
          placeholder="✨"
          className="h-7 w-12 rounded-md bg-surface-3 px-2 text-center text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {emoji && (
          <button
            type="button"
            onClick={() => { setEmoji(""); commit({ emoji: null }); }}
            className="rounded-md px-2 text-[10px] text-text-tertiary hover:text-text-primary"
            title="Clear emoji"
          >
            clear
          </button>
        )}
      </div>

      {/* Color */}
      <p className="text-[10px] text-text-tertiary mb-1">Accent color</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setColor(c); commit({ color: c }); }}
            aria-label={c}
            className={
              "h-6 w-6 rounded-full border-2 transition-all " +
              (color.toLowerCase() === c.toLowerCase() ? "border-white" : "border-white/20 hover:border-white/40")
            }
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white/20 hover:border-white/40">
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); commit({ color: e.target.value }); }}
            className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent"
          />
        </label>
      </div>

      {/* Cover */}
      <p className="mt-3 text-[10px] text-text-tertiary mb-1">Cover image</p>
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={coverUrl.startsWith("data:") ? "" : coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          onBlur={() => commit({ cover: coverUrl.trim() || null })}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commit({ cover: coverUrl.trim() || null }); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="https://…  or upload →"
          className="flex-1 rounded-md bg-surface-3 px-2 py-1 text-[11px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <label className="cursor-pointer rounded-md border border-white/10 bg-surface-3 px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-4">
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        {coverUrl && (
          <button
            type="button"
            onClick={() => { setCoverUrl(""); commit({ cover: null }); }}
            className="rounded-md px-2 py-1 text-[10px] text-text-tertiary hover:text-error"
            title="Clear cover"
          >
            clear
          </button>
        )}
      </div>
      {coverErr && <p className="mt-1 text-[10px] text-error">{coverErr}</p>}
      {coverUrl && (
        <div className="mt-2 h-20 w-full overflow-hidden rounded-md border border-white/5 bg-surface-3">
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}
