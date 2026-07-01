import { Suspense } from "react";
import Link from "next/link";
import {
  getPost,
  getPostComments,
  getPostRevisions,
  getThumbnailUrl,
  getThumbUrl,
  getServiceColor,
  getServiceLabel,
  getFileUrl,
} from "@/lib/api";
import type { Comment, FileAttachment, PostRevision } from "@/lib/types";
import { formatDate, formatRelativeDate, formatFileSize, stripHtml, cn } from "@/lib/utils";
import { FavoriteButton } from "@/app/_components/FavoriteButton";
import { FlagButton } from "@/app/_components/FlagButton";
import { RelatedFromCreator } from "@/app/_components/RelatedFromCreator";
import { TranslateBox } from "@/app/_components/TranslateBox";
import { PostDetailStrings } from "@/app/_components/PostDetailStrings";
import { PostNavbar } from "@/app/_components/PostNavbar";
import { ImageGallery } from "@/app/_components/ImageGallery";

// ============================================================
// Post Detail — Dark Minimal + Lightbox
// ============================================================

type Params = Promise<{
  service: string;
  creatorId: string;
  postId: string;
}>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }) {
  const { service, creatorId, postId } = await params;
  try {
    const post = await getPost(service, creatorId, postId);
    const title = post.title || `Post ${postId}`;
    const description = post.substring
      ? stripHtml(post.substring).slice(0, 200)
      : `${getServiceLabel(post.service)} post from creator #${post.user}`;
    const imageUrl = post.file?.path ? getThumbUrl(post.file.path) : undefined;
    return {
      title,
      description,
      openGraph: {
        type: "article",
        title,
        description,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
        publishedTime: post.published,
        modifiedTime: post.edited,
      },
      twitter: {
        card: imageUrl ? "summary_large_image" : "summary",
        title,
        description,
        images: imageUrl ? [imageUrl] : undefined,
      },
      alternates: {
        canonical: `/${service}/user/${creatorId}/post/${postId}`,
      },
    };
  } catch {
    return { title: `Post ${postId}` };
  }
}

export default async function PostDetailPage({ params }: { params: Params }) {
  const { service, creatorId, postId } = await params;

  const post = await getPost(service, creatorId, postId).catch(() => null);

  if (!post) {
    return (
      <div className="min-h-screen">
        <PostNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold"><PostDetailStrings which="notFoundTitle" /></h2>
            <p className="mt-2 text-text-secondary"><PostDetailStrings which="notFoundBody" /></p>
            <Link href="/" className="mt-4 inline-block text-primary hover:underline"><PostDetailStrings which="backHome" /></Link>
          </div>
        </div>
      </div>
    );
  }

  const color = getServiceColor(post.service);
  const mainImage = getThumbnailUrl(post);
  const allImages: FileAttachment[] = [
    ...(post.file?.path ? [post.file] : []),
    ...post.attachments,
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title || `Post ${postId}`,
    "datePublished": post.published,
    "dateModified": post.edited || post.published,
    "author": {
      "@type": "Person",
      "name": `Creator #${post.user}`,
      "identifier": post.user,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Pawchive",
    },
    "image": post.file?.path ? getThumbUrl(post.file.path) : undefined,
    "description": post.substring ? stripHtml(post.substring).slice(0, 200) : undefined,
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostNavbar title={post.title} />

      <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="lg:flex lg:gap-8">
          {/* Main content: lightbox + description */}
          <div className="lg:flex-1 min-w-0 space-y-6">
            <ImageGallery images={allImages} />

            {/* Description — full width, below the main image */}
            {post.content && (
              <div className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    <PostDetailStrings which="description" />
                  </p>
                </div>
                <div className="text-sm leading-relaxed [&_p]:my-2 [&_a]:text-primary [&_a]:hover:underline">
                  <TranslateBox html={post.content} />
                </div>
              </div>
            )}
          </div>

          {/* Side panel — Fluent Design 2 */}
          <aside className="mt-6 lg:mt-0 lg:w-[360px] lg:shrink-0">
            <div className="lg:sticky lg:top-20 space-y-6">
              {/* Meta info */}
              <MetaPanel
                post={post}
                color={color}
                service={service}
                creatorId={creatorId}
                postId={postId}
              />

              {/* Attachments */}
              {post.attachments.length > 0 && (
                <AttachmentsPanel attachments={post.attachments} />
              )}

              {/* AI Summary — only when substring present */}
              {post.substring && (
                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">✨</span>
                    <p className="text-xs font-medium text-text-secondary"><PostDetailStrings which="aiSummary" /></p>
                  </div>
                  <p className="text-xs text-text-tertiary leading-relaxed">
                    {stripHtml(post.substring)}
                  </p>
                </div>
              )}

              {/* Revisions */}
              <Suspense fallback={null}>
                <RevisionsPanel service={service} creatorId={creatorId} postId={postId} />
              </Suspense>
            </div>
          </aside>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {post.prev ? (
            <Link
              href={`/${post.service}/user/${post.user}/post/${post.prev}`}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
            >
              <PostDetailStrings which="previous" />
            </Link>
          ) : <div />}
          {post.next ? (
            <Link
              href={`/${post.service}/user/${post.user}/post/${post.next}`}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
            >
              <PostDetailStrings which="next" />
            </Link>
          ) : <div />}
        </div>

        {/* Comments */}
        <section className="mt-12 border-t border-white/5 pt-8">
          <h3 className="mb-6 font-display text-xl"><PostDetailStrings which="comments" /></h3>
          <Suspense fallback={<p className="text-sm text-text-tertiary"><PostDetailStrings which="commentsLoading" /></p>}>
            <CommentsList service={service} creatorId={creatorId} postId={postId} />
          </Suspense>
        </section>

        {/* Related — horizontal scroll */}
        <section className="mt-12 border-t border-white/5 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl"><PostDetailStrings which="more" /></h3>
            <Link
              href={`/${post.service}/user/${post.user}`}
              className="text-sm text-text-secondary hover:text-primary transition-colors"
            >
              <PostDetailStrings which="viewProfile" />
            </Link>
          </div>
          <Suspense fallback={<RelatedSkeleton />}>
            <RelatedFromCreator
              service={post.service}
              creatorId={post.user}
              excludePostId={postId}
            />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

// ============================================================
// Navbar
// ============================================================

// ============================================================
// Image Lightbox
// ============================================================

// ============================================================
// Meta Panel — Fluent Design 2
// ============================================================
function MetaPanel({
  post,
  color,
  service,
  creatorId,
  postId,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getPost>>>;
  color: string;
  service: string;
  creatorId: string;
  postId: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold sm:text-xl leading-snug">
          {post.title || <PostDetailStrings which="untitled" />}
        </h1>
      </div>

      {/* Action buttons — favorite + flag */}
      <div className="flex flex-wrap items-center gap-2 -mx-1">
        <FavoriteButton kind="post" service={service} creatorId={creatorId} postId={postId} />
        <FlagButton service={service} creatorId={creatorId} postId={postId} />
      </div>

      {/* Creator */}
      <Link
        href={`/${post.service}/user/${post.user}`}
        className="flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-surface-2 -mx-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {post.user.slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium">Creator #{post.user}</p>
          <p className="text-[11px] text-text-tertiary"><PostDetailStrings which="viewProfile" /></p>
        </div>
      </Link>

      {/* Meta rows */}
      <div className="space-y-2">
        <MetaRow label="Platform">
          <span
            className="neo-badge inline-block rounded-md px-2 py-0.5 text-[11px] font-bold"
            style={{ color }}
          >
            {getServiceLabel(post.service)}
          </span>
        </MetaRow>
        <MetaRow label="Published" value={formatDate(post.published)} />
        <MetaRow label="Added" value={formatRelativeDate(post.added)} />
        {post.edited && post.edited !== post.published && (
          <MetaRow label="Edited" value={formatDate(post.edited)} />
        )}
        <MetaRow label="Post ID" value={post.id} />
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-tertiary">{label}</span>
      {children || <span className="text-text-secondary">{value}</span>}
    </div>
  );
}

// ============================================================
// Attachments Panel — MD3
// ============================================================
function AttachmentsPanel({ attachments }: { attachments: FileAttachment[] }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h4 className="mb-3 text-sm font-medium"><PostDetailStrings which="attachments" vars={{ count: attachments.length }} /></h4>
      <div className="space-y-1">
        {attachments.map((att) => (
          <a
            key={att.path}
            href={getFileUrl(att.path)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg p-2 text-xs transition-colors hover:bg-surface-2"
          >
            <span className="text-text-tertiary">
              {att.name.match(/\.(\w+)$/)?.[1]?.toUpperCase() || "FILE"}
            </span>
            <span className="flex-1 truncate text-text-secondary">{att.name}</span>
            <span className="text-primary">↓</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Revisions Panel
// ============================================================
async function RevisionsPanel({
  service,
  creatorId,
  postId,
}: {
  service: string;
  creatorId: string;
  postId: string;
}) {
  let revisions: PostRevision[] = [];
  try {
    revisions = await getPostRevisions(service, creatorId, postId);
  } catch {
    return null;
  }
  if (revisions.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h4 className="mb-3 text-sm font-medium"><PostDetailStrings which="revisionHistory" vars={{ count: revisions.length }} /></h4>
      <div className="space-y-3">
        {revisions.map((rev) => (
          <div key={rev.revision_id} className="border-l-2 border-white/5 pl-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-text-tertiary">r{rev.revision_id}</span>
              <span className="text-[10px] text-text-tertiary">
                {formatRelativeDate(rev.added)}
              </span>
            </div>
            <p className="text-xs font-medium line-clamp-1">{rev.title}</p>
            {rev.content && (
              <p className="mt-0.5 text-[11px] text-text-tertiary line-clamp-2">
                {stripHtml(rev.content)}
              </p>
            )}
            {rev.attachments.length > 0 && (
              <div className="mt-1 flex gap-1">
                {rev.attachments.slice(0, 3).map((att, i) => (
                  <span key={i} className="text-[10px] text-text-tertiary">
                    📎 {att.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Comments List
// ============================================================
async function CommentsList({
  service,
  creatorId,
  postId,
}: {
  service: string;
  creatorId: string;
  postId: string;
}) {
  let comments: Comment[] = [];
  try {
    comments = await getPostComments(service, creatorId, postId);
  } catch {
    return (
      <p className="text-sm text-text-tertiary"><PostDetailStrings which="commentsNone" /></p>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-text-tertiary"><PostDetailStrings which="commentsNone" /></p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <CommentCard key={c.id} comment={c} />
      ))}
    </div>
  );
}

function RelatedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-md3">
          <div className="skeleton" style={{ aspectRatio: "3/4" }} />
          <div className="p-2.5 space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-2 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3">
      {/* Avatar placeholder */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-text-tertiary">
        {comment.commenter.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-secondary">
            #{comment.commenter}
          </span>
          <span className="text-[10px] text-text-tertiary">
            {formatRelativeDate(comment.published)}
          </span>
        </div>
        <TranslateBox plain={comment.content} compact />
        {comment.revisions && comment.revisions.length > 0 && (
          <details className="mt-1">
            <summary className="text-[10px] text-text-tertiary cursor-pointer hover:text-text-secondary">
              Edited ({comment.revisions.length} revision{comment.revisions.length > 1 ? "s" : ""})
            </summary>
            <div className="mt-1 space-y-1 pl-2 border-l border-white/5">
              {comment.revisions.map((r) => (
                <p key={r.id} className="text-[11px] text-text-tertiary line-through">
                  {r.content}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
