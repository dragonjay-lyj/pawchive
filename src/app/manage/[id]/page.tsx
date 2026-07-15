"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  profiles?: { username: string | null } | null;
}

export default function PostDetailPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [post, setPost] = useState<UserPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/public?id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.post) setPost(json.post);
        else setError("Post not found.");
      })
      .catch(() => setError("Failed to load post."))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8">
          <p className="text-text-tertiary">{t("common.loading")}</p>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-text-secondary mb-4">{error || "Post not found."}</p>
            <Link href="/manage" className="text-primary hover:underline text-sm">← Back to Manage</Link>
          </div>
        </main>
      </div>
    );
  }

  const color = getServiceColor(post.service);

  return (
    <div className="min-h-screen">
      <SiteNav active="manage" />

      <main className="mx-auto max-w-[720px] px-4 pb-24 pt-8">
        <Link href="/manage" className="inline-block mb-6 text-xs text-text-tertiary hover:text-primary">
          ← {t("manage.title")}
        </Link>

        {/* Header */}
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
                <span>{new Date(post.published).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Author actions */}
        {isAuthor && (
          <div className="flex items-center gap-2 mb-6">
            <Link
              href={`/manage`}
              onClick={(e) => { e.preventDefault(); router.push(`/manage`); }}
              className="rounded-lg bg-surface-3 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-4"
            >
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

        {/* Content */}
        {post.content && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-xs font-medium text-text-tertiary mb-3">{t("manage.description")}</h2>
            <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>
        )}

        {/* Attachments */}
        {post.post_attachments && post.post_attachments.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-medium text-text-tertiary mb-3">
              {t("manage.attachmentsCount", { count: post.post_attachments.length })}
            </h2>
            <div className="space-y-2">
              {post.post_attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg bg-surface-2 p-3"
                >
                  <span className="text-text-secondary">📎</span>
                  <span className="flex-1 text-sm text-text-primary truncate">{a.name}</span>
                  {a.size && (
                    <span className="text-xs text-text-tertiary">{formatBytes(a.size)}</span>
                  )}
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/30"
                    >
                      Download
                    </a>
                  ) : a.file_path ? (
                    <span className="text-xs text-text-tertiary">{a.file_path}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
