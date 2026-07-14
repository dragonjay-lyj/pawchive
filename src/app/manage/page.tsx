"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { SiteNav } from "@/app/_components/SiteNav";
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

export default function ManagePage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use public API — everyone can see all posts
      const res = await fetch("/api/posts/public");
      if (!res.ok) throw new Error(t("manage.loadFailed"));
      const json = await res.json();
      setPosts(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

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
      await loadPosts();
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-[960px] px-4 pb-24 pt-8">
          <p className="text-text-tertiary">{t("manage.loading")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav active="manage" />

      <main className="mx-auto max-w-[960px] px-4 pb-24 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">{t("manage.title")}</h1>
          {user && (
            <button
              onClick={openNew}
              className="neo-badge rounded-xl px-4 py-2 text-sm font-bold text-primary hover:bg-surface-2"
            >
              {t("manage.newPost")}
            </button>
          )}
        </div>

        {error && (
          <div className="glass mb-4 rounded-2xl p-4 text-sm text-error">{error}</div>
        )}

        {posts.length === 0 && !loading && (
          <div className="glass rounded-2xl p-12 text-center text-text-secondary">
            {t("manage.noPosts")}
          </div>
        )}

        <div className="space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="glass rounded-2xl p-4 cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => router.push(`/manage/${p.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="neo-badge rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ color: getServiceColor(p.service) }}
                    >
                      {getServiceLabel(p.service)}
                    </span>
                    {p.is_new && (
                      <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">{t("manage.new")}</span>
                    )}
                    {/* Link to upstream creator page */}
                    <Link
                      href={`/${p.service}/user/${p.creator_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-text-tertiary hover:text-primary"
                    >
                      @{p.creator_id}
                    </Link>
                  </div>
                  <h3 className="text-sm font-medium truncate">{p.title}</h3>
                  {p.content && (
                    <p className="mt-1 text-xs text-text-tertiary line-clamp-2">{p.content}</p>
                  )}
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    {t("manage.attachmentsCount", { count: p.post_attachments?.length ?? 0 })}
                    {p.published && ` · ${new Date(p.published).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/manage/${p.id}`}
                    className="rounded-lg bg-surface-3 px-3 py-1 text-xs text-text-secondary hover:bg-surface-4 hover:text-text-primary"
                  >
                    {t("manage.edit")}
                  </Link>
                  {user && user.id === p.user_id && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                        className="rounded-lg bg-surface-3 px-3 py-1 text-xs text-text-secondary hover:bg-surface-4 hover:text-text-primary"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="rounded-lg bg-surface-3 px-3 py-1 text-xs text-error hover:bg-surface-4"
                      >
                        {t("manage.delete")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm pt-12 pb-12">
            <div className="glass-strong mx-4 w-full max-w-lg rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl">{editingId ? t("manage.editPost") : t("manage.newPostTitle")}</h2>
                <button onClick={() => setShowForm(false)} className="text-text-tertiary hover:text-text-primary text-xl leading-none">✕</button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs text-text-tertiary">{t("manage.platform")}</label>
                  <select
                    value={form.service}
                    onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary/30 focus:outline-none"
                  >
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>{getServiceLabel(s)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-text-tertiary">{t("manage.creatorId")}</label>
                  <input
                    type="text"
                    value={form.creator_id}
                    onChange={(e) => setForm((f) => ({ ...f, creator_id: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                    placeholder="e.g. 12345"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-tertiary">{t("manage.postId")}</label>
                  <input
                    type="text"
                    value={form.post_id}
                    onChange={(e) => setForm((f) => ({ ...f, post_id: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                    placeholder={t("manage.postIdPlaceholder")}
                  />
                </div>

                <div>
                  <label className="text-xs text-text-tertiary">{t("manage.titleField")}</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-tertiary">{t("manage.description")}</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none resize-y"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-tertiary">{t("manage.publishedDate")}</label>
                  <input
                    type="datetime-local"
                    value={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary/30 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-text-tertiary">{t("manage.attachments")}</label>
                    <button type="button" onClick={addAttachment} className="text-xs text-primary hover:underline">{t("manage.addAttachment")}</button>
                  </div>
                  {form.attachments.map((a, i) => (
                    <div key={i} className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => {
                          setForm((f) => {
                            const att = [...f.attachments];
                            att[i] = { ...att[i], name: e.target.value };
                            return { ...f, attachments: att };
                          });
                        }}
                        placeholder={t("manage.fileName")}
                        className="flex-1 rounded-lg border border-white/5 bg-surface-2 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={a.url}
                        onChange={(e) => {
                          setForm((f) => {
                            const att = [...f.attachments];
                            att[i] = { ...att[i], url: e.target.value };
                            return { ...f, attachments: att };
                          });
                        }}
                        placeholder={t("manage.downloadUrl")}
                        className="flex-[2] rounded-lg border border-white/5 bg-surface-2 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={a.size}
                        onChange={(e) => {
                          setForm((f) => {
                            const att = [...f.attachments];
                            att[i] = { ...att[i], size: e.target.value };
                            return { ...f, attachments: att };
                          });
                        }}
                        placeholder={t("manage.size")}
                        className="w-20 rounded-lg border border-white/5 bg-surface-2 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                      />
                      <button type="button" onClick={() => removeAttachment(i)} className="text-error text-xs hover:underline">✕</button>
                    </div>
                  ))}
                </div>

                {saveMsg && (
                  <p className="text-xs text-error">{saveMsg}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? t("manage.saving") : editingId ? t("manage.update") : t("manage.create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl bg-surface-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-4"
                  >
                    {t("manage.cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
