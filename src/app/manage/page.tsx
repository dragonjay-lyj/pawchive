"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-provider";
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

// ---------- Empty form state ----------
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
  const { user, loading: authLoading } = useAuth();
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
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("Failed to load posts.");
      const json = await res.json();
      setPosts(json.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); setError("Sign in to manage posts."); return; }
    void loadPosts();
  }, [user, authLoading]);

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
      attachments: p.post_attachments.map((a) => ({
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
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete.");
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
      if (!res.ok) throw new Error("Save failed.");
      setShowForm(false);
      setSaveMsg("");
      await loadPosts();
    } catch {
      setSaveMsg("Failed to save.");
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
          <p className="text-text-tertiary">Loading…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-[960px] px-4 pb-24 pt-8">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-text-secondary mb-4">Sign in to manage posts.</p>
            <Link href="/settings" className="text-primary hover:underline text-sm">
              Go to Settings →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav />

      <main className="mx-auto max-w-[960px] px-4 pb-24 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Manage Posts</h1>
          <button
            onClick={openNew}
            className="neo-badge rounded-xl px-4 py-2 text-sm font-bold text-primary hover:bg-surface-2"
          >
            + New Post
          </button>
        </div>

        {error && (
          <div className="glass mb-4 rounded-2xl p-4 text-sm text-error">{error}</div>
        )}

        {/* Post list */}
        {posts.length === 0 && !loading && (
          <div className="glass rounded-2xl p-12 text-center text-text-secondary">
            No posts yet. Click &quot;+ New Post&quot; to create one.
          </div>
        )}

        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-4">
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
                      <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">New</span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium truncate">{p.title}</h3>
                  {p.content && (
                    <p className="mt-1 text-xs text-text-tertiary line-clamp-2">{p.content}</p>
                  )}
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    {p.post_attachments?.length ?? 0} attachments
                    {p.published && ` · ${new Date(p.published).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg bg-surface-3 px-3 py-1 text-xs text-text-secondary hover:bg-surface-4 hover:text-text-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg bg-surface-3 px-3 py-1 text-xs text-error hover:bg-surface-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Post form modal */}
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm pt-12 pb-12">
            <div className="glass-strong mx-4 w-full max-w-lg rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl">{editingId ? "Edit Post" : "New Post"}</h2>
                <button onClick={() => setShowForm(false)} className="text-text-tertiary hover:text-text-primary text-xl leading-none">✕</button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Service */}
                <div>
                  <label className="text-xs text-text-tertiary">Platform</label>
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

                {/* Creator ID */}
                <div>
                  <label className="text-xs text-text-tertiary">Creator ID</label>
                  <input
                    type="text"
                    value={form.creator_id}
                    onChange={(e) => setForm((f) => ({ ...f, creator_id: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                    placeholder="e.g. 12345"
                  />
                </div>

                {/* Post ID (optional) */}
                <div>
                  <label className="text-xs text-text-tertiary">Post ID (leave empty for new)</label>
                  <input
                    type="text"
                    value={form.post_id}
                    onChange={(e) => setForm((f) => ({ ...f, post_id: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                    placeholder="Upstream post ID if exists"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-text-tertiary">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-xs text-text-tertiary">Description</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none resize-y"
                  />
                </div>

                {/* Published date */}
                <div>
                  <label className="text-xs text-text-tertiary">Published date</label>
                  <input
                    type="datetime-local"
                    value={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-primary/30 focus:outline-none"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-text-tertiary">Attachments (download links)</label>
                    <button type="button" onClick={addAttachment} className="text-xs text-primary hover:underline">+ Add</button>
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
                        placeholder="File name"
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
                        placeholder="Download URL"
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
                        placeholder="Size"
                        className="w-20 rounded-lg border border-white/5 bg-surface-2 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
                      />
                      <button type="button" onClick={() => removeAttachment(i)} className="text-error text-xs hover:underline">✕</button>
                    </div>
                  ))}
                </div>

                {saveMsg && (
                  <p className={`text-xs ${saveMsg.includes("Failed") ? "text-error" : "text-green-400"}`}>{saveMsg}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : editingId ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl bg-surface-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-4"
                  >
                    Cancel
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
