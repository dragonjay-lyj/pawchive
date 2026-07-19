"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { getServiceColor, getServiceLabel } from "@/lib/api";

interface Attachment {
  id: string; name: string; url: string | null; file_path: string | null; size: number | null;
}

interface UserPost {
  id: string; user_id: string; service: string; creator_id: string; post_id: string | null;
  title: string; content: string | null; published: string | null; is_new: boolean;
  is_pinned?: boolean; tags?: string[]; thanks_count?: number;
  created_at: string; updated_at: string; post_attachments: Attachment[];
  profiles?: { username: string | null } | null;
}

const SERVICES = ["patreon", "fanbox", "fantia", "subscribestar", "discord", "gumroad", "boosty", "afdian"] as const;
type ViewMode = "list" | "gallery";

interface PostForm {
  service: string; creator_id: string; post_id: string;
  title: string; content: string; published: string;
  tags: string; sourceUrl: string;
  attachments: { name: string; url: string; file_path: string; size: string }[];
}

const emptyForm: PostForm = { service: "patreon", creator_id: "", post_id: "", title: "", content: "", published: "", tags: "", sourceUrl: "", attachments: [] };

export function ContentFeed({ initialPosts }: { initialPosts: UserPost[] }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<UserPost[]>(initialPosts);
  const [view, setView] = useState<ViewMode>("list");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Collect all tags for filter bar
  const allTags = [...new Set(posts.flatMap((p) => p.tags ?? []))].sort();

  // Sort: pinned first, then by date
  const sorted = [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filtered = activeTag
    ? sorted.filter((p) => (p.tags ?? []).includes(activeTag))
    : sorted;

  // Thank handler
  const handleThanks = async (postId: string) => {
    if (!user) { router.push("/settings"); return; }
    try {
      await fetch(`/api/posts/${postId}/thanks`, { method: "POST" });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, thanks_count: (p.thanks_count ?? 0) + 1 } : p));
    } catch { /* ignore */ }
  };

  // Edit / Delete handlers
  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); setSaveMsg(""); };
  const openEdit = (p: UserPost) => {
    setForm({
      service: p.service, creator_id: p.creator_id, post_id: p.post_id ?? "",
      title: p.title, content: p.content ?? "", published: p.published?.slice(0, 16) ?? "",
      tags: (p.tags ?? []).join(", "), sourceUrl: "",
      attachments: (p.post_attachments ?? []).map((a) => ({ name: a.name, url: a.url ?? "", file_path: a.file_path ?? "", size: a.size?.toString() ?? "" })),
    });
    setEditingId(p.id); setShowForm(true); setSaveMsg("");
  };
  const handleDelete = async (id: string) => {
    if (!confirm(t("manage.deleteConfirm"))) return;
    try { await fetch(`/api/posts?id=${id}`, { method: "DELETE" }); setPosts((prev) => prev.filter((p) => p.id !== id)); }
    catch { setError(t("manage.deleteFailed")); }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.service || !form.creator_id || !form.title) return;
    setSaving(true); setSaveMsg("");
    try {
      const body = {
        id: editingId ?? undefined, service: form.service, creator_id: form.creator_id,
        post_id: form.post_id || undefined, title: form.title, content: form.content || undefined,
        published: form.published || undefined,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        source_url: form.sourceUrl || undefined,
        attachments: form.attachments.filter((a) => a.name).map((a) => ({
          name: a.name, url: a.url || undefined, file_path: a.file_path || undefined,
          size: a.size ? parseInt(a.size, 10) || undefined : undefined,
        })),
      };
      const res = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(t("manage.saveFailed"));
      setShowForm(false); setSaveMsg("");
      try { const r2 = await fetch("/api/posts/public"); if (r2.ok) { const j = await r2.json(); setPosts(j.posts ?? []); } } catch {}
    } catch { setSaveMsg(t("manage.saveFailed")); }
    finally { setSaving(false); }
  };
  const addAttachment = () => setForm((f) => ({ ...f, attachments: [...f.attachments, { name: "", url: "", file_path: "", size: "" }] }));
  const removeAttachment = (i: number) => setForm((f) => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }));

  return (
    <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{t("manage.community")}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="mica inline-flex rounded-lg border border-white/5 p-0.5">
            <button onClick={() => setView("list")} className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${view === "list" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary"}`}>☰ List</button>
            <button onClick={() => setView("gallery")} className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${view === "gallery" ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary"}`}>⊞ Gallery</button>
          </div>
          {user && !showForm && (
            <button onClick={openNew} className="neo-badge rounded-xl px-4 py-2 text-sm font-bold text-primary hover:bg-surface-2">
              {t("manage.newPost")}
            </button>
          )}
        </div>
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${!activeTag ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"}`}
          >All</button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${activeTag === tag ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-3"}`}
            >{tag}</button>
          ))}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">{editingId ? t("manage.editPost") : t("manage.newPostTitle")}</h2>
            <button onClick={() => setShowForm(false)} className="text-text-tertiary hover:text-text-primary">✕</button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder={t("manage.titleField")}
              className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2.5 text-base font-medium text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none" />
            <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} placeholder={t("manage.postContent")}
              className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none resize-y" />
            <div className="flex gap-2">
              <select value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                className="rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary/30 focus:outline-none">
                {SERVICES.map((s) => <option key={s} value={s}>{getServiceLabel(s)}</option>)}
              </select>
              <input type="text" value={form.creator_id} onChange={(e) => setForm((f) => ({ ...f, creator_id: e.target.value }))} required placeholder={t("manage.creatorId")}
                className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <input type="text" value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder={t("manage.sourceUrl")}
                className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none" />
              <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder={t("manage.tagsPlaceholder")}
                className="w-40 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none" />
            </div>
            <details className="text-xs"><summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">{t("manage.attachments")} ({form.attachments.filter(a => a.name).length})</summary>
              <div className="mt-2 space-y-2">
                {form.attachments.map((a, i) => (
                  <div key={i} className="flex gap-1">
                    <input type="text" value={a.name} onChange={(e) => { setForm((f) => { const att = [...f.attachments]; att[i] = { ...att[i], name: e.target.value }; return { ...f, attachments: att }; }); }} placeholder={t("manage.fileName")} className="flex-1 rounded-lg border border-white/5 bg-surface-2 px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none" />
                    <input type="text" value={a.url} onChange={(e) => { setForm((f) => { const att = [...f.attachments]; att[i] = { ...att[i], url: e.target.value }; return { ...f, attachments: att }; }); }} placeholder={t("manage.downloadUrl")} className="flex-[2] rounded-lg border border-white/5 bg-surface-2 px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none" />
                    <button type="button" onClick={() => removeAttachment(i)} className="text-error text-xs px-1">✕</button>
                  </div>
                ))}
                <button type="button" onClick={addAttachment} className="text-xs text-primary hover:underline">{t("manage.addAttachment")}</button>
              </div>
            </details>
            {saveMsg && <p className="text-xs text-error">{saveMsg}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50">
                {saving ? t("manage.saving") : editingId ? t("manage.update") : t("manage.create")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-surface-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface-4">{t("manage.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="glass mb-4 rounded-2xl p-4 text-sm text-error">{error}</div>}

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center text-text-secondary"><p className="text-lg mb-2">📝</p><p>{t("manage.noPosts")}</p></div>
      )}

      {/* --- LIST VIEW --- */}
      {view === "list" && (
        <div className="space-y-3">
          {filtered.map((p) => (
            <article key={p.id} className="glass rounded-2xl p-4 cursor-pointer hover:bg-surface-2 transition-colors flex gap-4"
              onClick={() => router.push(`/manage/${p.id}`)}>
              {/* Thumbnail */}
              <div className="hidden sm:block shrink-0 w-20 h-20 rounded-xl bg-surface-3 overflow-hidden">
                {p.post_attachments?.[0]?.url ? (
                  <img src={p.post_attachments[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex items-center justify-center h-full text-text-tertiary text-lg">📄</div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.is_pinned && <span className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-black bg-primary text-on-primary">PINNED</span>}
                  {(p.thanks_count ?? 0) >= 5 && <span className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 border-yellow-400">HOT</span>}
                  <span className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ color: getServiceColor(p.service) }}>{getServiceLabel(p.service)}</span>
                  {(p.tags ?? []).slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] text-text-tertiary">{tag}</span>
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-text-primary truncate mb-1">{p.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-1 mb-2">{p.content?.slice(0, 120)}</p>
                <div className="flex items-center gap-3 text-[11px] text-text-tertiary" onClick={(e) => e.stopPropagation()}>
                  <span>{(p.profiles?.username ?? p.user_id?.slice(0, 8))}</span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span>·</span>
                  <button onClick={(e) => { e.stopPropagation(); handleThanks(p.id); }} className="hover:text-red-400 transition-colors">❤️ {p.thanks_count ?? 0}</button>
                  {user && user.id === p.user_id && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="hover:text-text-primary">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="hover:text-error">🗑</button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* --- GALLERY VIEW --- */}
      {view === "gallery" && (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="break-inside-avoid glass rounded-xl overflow-hidden cursor-pointer group hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={() => router.push(`/manage/${p.id}`)}>
              <div className="relative bg-surface-3">
                {p.post_attachments?.[0]?.url ? (
                  <img src={p.post_attachments[0].url} alt={p.title} className="w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex items-center justify-center aspect-[4/3] bg-surface-2 text-text-tertiary text-2xl">📄</div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                  <p className="text-[10px] text-white/70">{p.profiles?.username ?? p.user_id?.slice(0, 8)} · ❤️ {p.thanks_count ?? 0}</p>
                </div>
                {p.is_pinned && <span className="absolute top-2 left-2 neo-badge rounded-md px-1.5 py-0.5 text-[9px] font-black bg-primary text-on-primary">PIN</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
