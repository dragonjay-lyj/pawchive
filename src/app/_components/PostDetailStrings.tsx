"use client";

import { useI18n } from "@/lib/i18n/provider";

export function PostDetailStrings({
  which,
  vars,
}: {
  which: keyof typeof MAP;
  vars?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  const key = MAP[which];
  return <>{t(key as any, vars)}</>;
}

const MAP = {
  attachments: "post.attachments",
  aiSummary: "post.aiSummary",
  aiSummaryNone: "post.aiSummary.none",
  description: "post.description",
  revisionHistory: "post.revisionHistory",
  previous: "post.previous",
  next: "post.next",
  comments: "post.comments",
  commentsLoading: "post.comments.loading",
  commentsNone: "post.comments.none",
  more: "post.more",
  viewProfile: "post.viewProfile",
  relatedNone: "post.related.none",
  relatedError: "post.related.error",
  untitled: "post.untitled",
  notFoundTitle: "post.notFound.title",
  notFoundBody: "post.notFound.body",
  backHome: "post.backHome",
} as const;
