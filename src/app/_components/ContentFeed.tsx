"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { getServiceColor, getServiceLabel } from "@/lib/api";

interface Attachment {
  id: string;
  name: string;
  url: string | null;
  file_path: string | null;
  size: number | null;
}

interface UserPost {
  id: string;
  user_id: string;
  service: string;
  creator_id: string;
  post_id: string | null;
  title: string;
  content: string | null;
  published: string | null;
  is_new: boolean;
  created_at: string;
  updated_at: string;
  post_attachments: Attachment[];
  profiles?: { username: string | null } | null;
}

const SERVICES = ["patreon", "fanbox", "fantia", "subscribestar", "discord", "gumroad", "boosty", "afdian"] as const;

interface PostForm {
  service: string;
  creator_id: string;
  post_id: string;
  title: string;
  content: string;
  published: string;
  attachments: { name: string; url: string; file_path: string; size: string }[];
}

const emptyForm: PostForm = {
  service: "patreon",
  creator_id: "",
  post_id: "",
  title: "",
  content: "",
  published: "",
  attachments: [],
};

export function ContentFeed({ initialPosts }: { initialPosts: UserPost[] }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<UserPost[]>(initialPosts);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");


  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setSaveMsg("");
  };

  const openEdit = (p: UserPost) => {
    setForm({
      service: p.service,
      creator_id: p.creator_id,
      post_id: p.post_id ?? "",
      title: p.title,
      content: p.content ?? "",
      published: p.published?.slice(0, 16) ?? "",
      attachments: (p.post_attachments ?? []).map((a) => ({
        name: a.name,
        url: a.url ?? "",
        file_path: a.file_path ?? "",
        size: a.size?.toString() ?? "",
      })),
    });
    setEditingId(p.id);
    setShowForm(true);
    setSaveMsg("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("manage.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("manage.deleteFailed"));
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError(t("manage.deleteFailed"));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.service || !form.creator_id || !form.title) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body = {
        id: editingId ?? undefined,
        service: form.service,
        creator_id: form.creator_id,
        post_id: form.post_id || undefined,
        title: form.title,
        content: form.content || undefined,
        published: form.published || undefined,
        attachments: form.attachments
          .filter((a) => a.name)
          .map((a) => ({
            name: a.name,
            url: a.url || undefined,
            file_path: a.file_path || undefined,
            size: a.size ? parseInt(a.size, 10) || undefined : undefined,
          })),
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t("manage.saveFailed"));
      setShowForm(false);
      setSaveMsg("");
      // Reload posts from public API after save
      try {
        const res = await fetch("/api/posts/public");
        if (res.ok) {
          const json = await res.json();
          setPosts(json.posts ?? []);
        }
      } catch { /* ignore */ }
    } catch {
      setSaveMsg(t("manage.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const addAttachment = () => {
    setForm((f) => ({
      ...f,
      attachments: [...f.attachments, { name: "", url: "", file_path: "", size: "" }],
    }));
  };

  const removeAttachment = (i: number) => {
    setForm((f) => ({
      ...f,
      attachments: f.attachments.filter((_, idx) => idx !== i),
    }));
  };

  return (
    <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t("manage.community")}</h1>
          {user && !showForm && (
            <button
              onClick={openNew}
              className="neo-badge rounded-xl px-4 py-2 text-sm font-bold text-primary hover:bg-surface-2"
            >
              {t("manage.newPost")}
            </button>
          )}
        </div>

        {/* Inline post form */}
        {showForm && (
          <div className="glass rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-primary">
                {editingId ? t("manage.editPost") : t("manage.newPostTitle")}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder={t("manage.titleField")}
                className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2.5 text-base font-medium text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
              />

              {/* Content */}
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                placeholder={t("manage.postContent")}
                className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none resize-y"
              />

              {/* Platform + Creator ID */}
              <div className="flex gap-2">
                <select
                  value={form.service}
                  onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                  className="rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary/30 focus:outline-none"
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{getServiceLabel(s)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.creator_id}
                  onChange={(e) => setForm((f) => ({ ...f, creator_id: e.target.value }))}
                  required
                  placeholder={t("manage.creatorId")}
                  className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                />
              </div>

              {/* Attachments (collapsible) */}
              <details className="text-xs">
                <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
                  {t("manage.attachments")} ({form.attachments.filter(a => a.name).length})
                </summary>
                <div className="mt-2 space-y-2">
                  {form.attachments.map((a, i) => (
                    <div key={i} className="flex gap-1">
                      <input
                        type="text" value={a.name}
                        onChange={(e) => { setForm((f) => { const att = [...f.attachments]; att[i] = { ...att[i], name: e.target.value }; return { ...f, attachments: att }; }); }}
                        placeholder={t("manage.fileName")}
                        className="flex-1 rounded-lg border border-white/5 bg-surface-2 px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                      />
                      <input
                        type="text" value={a.url}
                        onChange={(e) => { setForm((f) => { const att = [...f.attachments]; att[i] = { ...att[i], url: e.target.value }; return { ...f, attachments: att }; }); }}
                        placeholder={t("manage.downloadUrl")}
                        className="flex-[2] rounded-lg border border-white/5 bg-surface-2 px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                      />
                      <button type="button" onClick={() => removeAttachment(i)} className="text-error text-xs px-1">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={addAttachment} className="text-xs text-primary hover:underline">{t("manage.addAttachment")}</button>
                </div>
              </details>

              {saveMsg && <p className="text-xs text-error">{saveMsg}</p>}

              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? t("manage.saving") : editingId ? t("manage.update") : t("manage.create")}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-xl bg-surface-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface-4"
                >
                  {t("manage.cancel")}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="glass mb-4 rounded-2xl p-4 text-sm text-error">{error}</div>
        )}

        {/* Forum-style post list */}
        {posts.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center text-text-secondary">
            <p className="text-lg mb-2">📝</p>
            <p>{t("manage.noPosts")}</p>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((p) => {
            const authorName = p.profiles?.username
              ?? (p.user_id ? p.user_id.slice(0, 8) : t("manage.authorAnonymous"));
            const time = p.created_at
              ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "";

            return (
              <article
                key={p.id}
                className="glass rounded-2xl p-5 cursor-pointer hover:bg-surface-2 transition-colors"
                onClick={() => router.push(`/manage/${p.id}`)}
              >
                {/* Meta line */}
                <div className="flex items-center gap-2 mb-3 text-xs text-text-tertiary">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {authorName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-text-secondary font-medium">{authorName}</span>
                  <span>·</span>
                  <span>{time}</span>
                  <span>·</span>
                  <span
                    className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ color: getServiceColor(p.service) }}
                  >
                    {getServiceLabel(p.service)}
                  </span>
                  <Link
                    href={`/${p.service}/user/${p.creator_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-text-tertiary hover:text-primary"
                  >
                    @{p.creator_id}
                  </Link>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-text-primary mb-2 leading-snug">
                  {p.title}
                </h3>

                {/* Content preview */}
                {p.content && (
                  <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed mb-3">
                    {p.content}
                  </p>
                )}

                {/* Footer actions */}
                <div className="flex items-center gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/manage/${p.id}`}
                    className="rounded-lg bg-surface-3 px-3 py-1 text-text-secondary hover:bg-surface-4 hover:text-text-primary"
                  >
                    {t("manage.viewPost")} {p.post_attachments?.length ? `· ${p.post_attachments.length} 📎` : ""}
                  </Link>
                  {user && user.id === p.user_id && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                        className="rounded-lg px-2 py-1 text-text-tertiary hover:text-text-primary"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="rounded-lg px-2 py-1 text-text-tertiary hover:text-error"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
    </main>
  );
}
