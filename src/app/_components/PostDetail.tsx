"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { getServiceColor, getServiceLabel } from "@/lib/api";
import { CommentSection } from "@/app/_components/CommentSection";
import { PostLightbox } from "@/app/_components/PostLightbox";
import { renderMarkdown } from "@/lib/markdown";

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
  is_pinned?: boolean;
  tags?: string[];
  thanks_count?: number;
  source_url?: string;
  is_nsfw?: boolean;
  created_at: string;
  updated_at: string;
  post_attachments: Attachment[];
  profiles?: { username: string | null } | null;
}

export function PostDetail({ post, error: initError }: { post: UserPost | null; error: string | null }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(initError);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isAuthor = user && post && user.id === post.user_id;

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      router.push("/manage");
    } catch {
      setError("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  if (error || !post) {
    return (
      <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-text-secondary mb-4">{error || "Post not found."}</p>
          <Link href="/manage" className="text-primary hover:underline text-sm">← Back to Manage</Link>
        </div>
      </main>
    );
  }

  const color = getServiceColor(post.service);

  return (
    <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8">
      <Link href="/manage" className="inline-block mb-6 text-xs text-text-tertiary hover:text-primary">
        ← {t("manage.title")}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="neo-badge rounded-md px-2 py-0.5 text-xs font-bold" style={{ color }}>
            {getServiceLabel(post.service)}
          </span>
          {post.is_new && (
            <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs text-primary">{t("manage.new")}</span>
          )}
          <Link
            href={`/${post.service}/user/${post.creator_id}`}
            className="text-xs text-text-tertiary hover:text-primary"
          >
            @{post.creator_id}
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold">{post.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
            {(post.profiles?.username ?? post.user_id ?? "?").slice(0, 2).toUpperCase()}
          </span>
          <span>{post.profiles?.username ?? post.user_id?.slice(0, 8) ?? t("manage.authorAnonymous")}</span>
          {post.published && (
            <>
              <span>·</span>
              <span>{new Date(post.published).toLocaleDateString("en-US")}</span>
            </>
          )}
        </div>
      </div>

      {post.is_nsfw && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs text-red-400">
          🔞 {t("manage.nsfw")}
        </div>
      )}

      {/* Tags + source + thanks row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(post.tags ?? []).map((tag) => (
          <span key={tag} className="rounded-lg bg-surface-3 px-2 py-1 text-[10px] text-text-secondary">{tag}</span>
        ))}
        {post.source_url && (
          <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] text-blue-400 hover:bg-blue-500/20">
            🔗 Source
          </a>
        )}
        <button
          onClick={async () => {
            if (!user) { router.push("/settings"); return; }
            await fetch(`/api/posts/${post.id}/thanks`, { method: "POST" });
            window.location.reload();
          }}
          className="ml-auto rounded-lg bg-surface-3 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-4 transition-colors"
        >
           ❤️ {post.thanks_count ?? 0} {t("manage.thanks")}
        </button>
      </div>

      {isAuthor && (
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/manage`} className="rounded-lg bg-surface-3 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-4">
            {t("manage.edit")}
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-surface-3 px-3 py-1.5 text-xs text-error hover:bg-surface-4 disabled:opacity-50"
          >
            {deleting ? "…" : t("manage.delete")}
          </button>
        </div>
      )}

      {post.content && (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-text-tertiary">{t("manage.description")}</h2>
            <PostTranslateButton text={post.content} />
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-text-primary [&_a]:text-primary [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-surface-2 [&_pre]:p-2 [&_pre]:rounded-lg [&_blockquote]:border-primary/30 [&_img]:max-w-full [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        </div>
      )}

      {post.post_attachments && post.post_attachments.length > 0 && (
        <div className="space-y-4">
          {/* Gallery thumbnail strip — clickable images */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {post.post_attachments.filter(a => a.url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(a.url)).length > 0 && (
              <div className="flex gap-2">
                {post.post_attachments.filter(a => a.url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(a.url)).map((a, idx) => (
                  <button key={a.id} onClick={() => setLightboxIndex(idx)} className="shrink-0 rounded-xl overflow-hidden bg-surface-3 hover:ring-1 hover:ring-primary/50 transition-all">
                    <img src={a.url!} alt={a.name} className="h-24 w-24 object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download zone — Pro Tool Dark style */}
          <div className="rounded-2xl border border-white/5 bg-surface-1/80 p-5">
            <h2 className="text-xs font-medium text-text-tertiary mb-3 flex items-center gap-2">
              📦 {t("manage.attachments")} ({post.post_attachments.length})
              <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">{t("manage.verified")}</span>
            </h2>
            <div className="space-y-1.5">
              {post.post_attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-2.5 group hover:bg-surface-3 transition-colors">
                  <span className="text-text-secondary shrink-0">📎</span>
                  <span className="flex-1 text-sm text-text-primary truncate">{a.name}</span>
                  {a.size && <span className="text-[10px] text-text-tertiary font-mono">{formatBytes(a.size)}</span>}
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                      ⬇ {t("manage.download")}
                    </a>
                  ) : a.file_path ? (
                    <span className="text-xs text-text-tertiary italic">{a.file_path}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <CommentSection postId={post.id} />

      {lightboxIndex !== null && (
        <PostLightbox
          images={post.post_attachments
            .filter(a => a.url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(a.url))
            .map(a => ({ url: a.url!, name: a.name }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </main>
  );
}

/** Inline translate button for post content — calls /api/translate via DeepLX. */
function PostTranslateButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const doTranslate = async () => {
    if (translated) { setOpen(true); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 2000), source_lang: "AUTO", target_lang: "ZH" }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (json.data) { setTranslated(json.data); setOpen(true); }
      else setErr(json.error ?? "failed");
    } catch (e) { setErr(e instanceof Error ? e.message : "failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={doTranslate} disabled={loading} className="rounded-lg bg-surface-3 px-2 py-1 text-[10px] text-text-tertiary hover:bg-surface-4 hover:text-text-secondary disabled:opacity-50">
        {loading ? "…" : `🌐 ${t("manage.translate")}`}
      </button>
      {err && <span className="text-[10px] text-error ml-1">{err}</span>}
      {open && translated && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm pt-12 pb-12" onClick={() => setOpen(false)}>
          <div className="glass-strong mx-4 w-full max-w-lg rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">{t("manage.translate")}</h3>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary">✕</button>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{translated}</div>
          </div>
        </div>
      )}
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
