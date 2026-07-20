"use client";

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@/lib/supabase/auth-provider";
import { useI18n } from "@/lib/i18n/provider";
import { renderMarkdown } from "@/lib/markdown";

// Simple MD5 hash for Gravatar (inline to avoid dependency)
function md5(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}

function gravatarUrl(email: string | null | undefined): string {
  if (!email) return "";
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=40`;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  content: string;
  created_at: string;
}

export function CommentSection({ postId }: { postId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [expandedSpam, setExpandedSpam] = useState<Set<string>>(new Set());

  // Load comments
  const loadComments = () => {
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((json) => setComments(json.comments ?? []))
      .catch(() => setError("Failed to load comments."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Submit comment
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (content.trim().length < 3) { setMsg(t("manage.commentTooShort")); return; }
    setMsg("");
    startTransition(async () => {
      try {
        const body: Record<string, string> = { content: content.trim() };
        if (name.trim()) body.author_name = name.trim();
        if (email.trim()) body.author_email = email.trim();

        const res = await fetch(`/api/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to post comment.");
        const json = await res.json();
        setComments((prev) => [...prev, json.comment]);
        setContent("");
        if (!user) { setName(""); setEmail(""); }
      } catch {
        setMsg("Failed to post. Try again.");
      }
    });
  };

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-bold mb-4">
        💬 {t("manage.comments")} ({comments.length})
      </h2>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 mb-6 space-y-3">
        <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 px-3 py-2 text-[11px] text-text-tertiary">
          ⚠️ {t("manage.commentWarning")}
        </div>
        {!user && (
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("manage.commentName")}
              className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("manage.commentEmail")}
              className="flex-1 rounded-xl border border-white/5 bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none"
            />
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          placeholder={t("manage.commentPlaceholder")}
          className="w-full rounded-xl border border-white/5 bg-surface-2 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary/30 focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-text-tertiary">
            {t("manage.commentHint")}
          </p>
          <button
            type="submit"
            disabled={pending || !content.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "…" : t("manage.commentSubmit")}
          </button>
        </div>
        {msg && <p className="text-xs text-error">{msg}</p>}
      </form>

      {/* Comment list */}
      {loading ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-text-tertiary">
          {t("common.loading")}
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-error">{error}</div>
      ) : comments.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-text-tertiary">
          {t("manage.commentEmpty")}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const avatar = gravatarUrl(c.author_email);
            const displayName = c.author_name ?? (c.user_id ? c.user_id.slice(0, 8) : t("manage.authorAnonymous"));
            const isAuthor = user && c.user_id === user.id;

            const isGreat = c.content.length >= 100;
            const isSpam = c.content.length < 5;

            if (isSpam && !expandedSpam.has(c.id)) {
              return (
                <div key={c.id} className="glass rounded-2xl p-3">
                  <button
                    onClick={() => setExpandedSpam((s) => new Set(s).add(c.id))}
                    className="w-full text-left text-xs text-text-tertiary italic flex items-center gap-2 hover:text-text-secondary"
                  >
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px]">Collapsed</span>
                    This reply was flagged as low-effort. Click to expand.
                  </button>
                </div>
              );
            }

            return (
              <div key={c.id} className={`glass rounded-2xl p-4 ${isGreat ? "ring-1 ring-yellow-500/30 bg-yellow-500/3" : ""} ${isSpam ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-3">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-8 w-8 rounded-full bg-surface-3 shrink-0" />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-text-secondary">{displayName}</span>
                      {isGreat && (
                        <span className="rounded bg-yellow-500/20 px-1 py-0 text-[9px] text-yellow-400 font-medium">Great</span>
                      )}
                      {isAuthor && (
                        <span className="rounded bg-primary/20 px-1 py-0 text-[9px] text-primary">you</span>
                      )}
                      <span className="text-[10px] text-text-tertiary">
                        {new Date(c.created_at).toLocaleDateString("en-US")}
                      </span>
                    </div>
                    {/* Reply button */}
                    <button
                      onClick={() => {
                        const quote = `> ${c.content.slice(0, 120).replace(/\n/g, "\n> ")}\n\n`;
                        setContent((prev) => prev ? prev + "\n" + quote : quote);
                        const el = document.querySelector("textarea[placeholder]") as HTMLTextAreaElement;
                        el?.focus();
                      }}
                      className="text-[10px] text-text-tertiary hover:text-primary transition-colors"
                    >
                      ↩ Reply
                    </button>
                    <div
                      className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-text-primary [&_a]:text-primary [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-surface-2 [&_pre]:p-2 [&_pre]:rounded-lg [&_blockquote]:border-primary/30 [&_img]:max-w-[80px] [&_img]:inline"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(c.content) }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
