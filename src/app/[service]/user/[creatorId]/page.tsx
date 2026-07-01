import { Suspense } from "react";
import Link from "next/link";
import {
  getCreatorProfile,
  getCreatorPosts,
  getCreatorLinkedAccounts,
  getCreatorAnnouncements,
  getCreatorFancards,
  getThumbnailUrl,
  getServiceColor,
  getServiceLabel,
  getCreatorAvatarUrl,
  getCreatorBannerUrl,
  getFileUrl,
} from "@/lib/api";
import type { Post, LinkedAccount, Announcement, Fancard } from "@/lib/types";
import { formatDate, formatRelativeDate, formatFileSize, cn } from "@/lib/utils";
import { FavoriteButton } from "@/app/_components/FavoriteButton";
import { SafeImage } from "@/app/_components/SafeImage";
import { CreatorStrings } from "@/app/_components/CreatorStrings";
import { AnnouncementsTimeline } from "@/app/_components/AnnouncementsTimeline";
import { CreatorPostsPager } from "@/app/_components/CreatorPostsPager";
import { SiteNav } from "@/app/_components/SiteNav";

// ============================================================
// Creator Profile — Editorial Banner + Bento Grid
// ============================================================

type Params = Promise<{ service: string; creatorId: string }>;

export default async function CreatorPage({ params }: { params: Params }) {
  const { service, creatorId } = await params;

  const [profile, linkedAccounts, announcements, fancards] =
    await Promise.allSettled([
      getCreatorProfile(service, creatorId),
      getCreatorLinkedAccounts(service, creatorId),
      getCreatorAnnouncements(service, creatorId),
      service === "fanbox"
        ? getCreatorFancards(service, creatorId)
        : Promise.resolve([] as Fancard[]),
    ]);

  const creator =
    profile.status === "fulfilled"
      ? profile.value
      : {
          id: creatorId,
          name: "Unknown Creator",
          service,
          indexed: "",
          updated: "",
          public_id: "",
        };
  const accounts =
    linkedAccounts.status === "fulfilled" ? linkedAccounts.value : [];
  const anns =
    announcements.status === "fulfilled" ? announcements.value : [];
  const cards =
    fancards.status === "fulfilled" ? fancards.value : [];

  return (
    <div className="min-h-screen">
      <SiteNav />

      <main className="pb-24">
        {/* Editorial Banner with avatar + cover */}
        <Banner
          creator={creator}
          linkedAccounts={accounts}
          service={service}
          creatorId={creatorId}
        />

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          {/* Stats row */}
          <StatsBar
            service={service}
            creatorId={creatorId}
            linkedCount={accounts.length}
          />

          {/* Announcements — editorial timeline */}
          {anns.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 font-display text-xl"><CreatorStrings which="announcements" /></h2>
              <AnnouncementsTimeline announcements={anns} />
            </section>
          )}

          {/* Fancards section (Fanbox only) */}
          {cards.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 font-display text-xl"><CreatorStrings which="fancards" /></h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {cards.slice(0, 20).map((card) => (
                  <a
                    key={card.id}
                    href={getFileUrl(`/${card.hash.slice(0, 2)}/${card.hash.slice(0, 4)}/${card.hash}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-md3 group flex flex-col"
                  >
                    <div className="relative overflow-hidden bg-surface-3" style={{aspectRatio: "3/4"}}>
                      <img
                        src={getFileUrl(`/${card.hash.slice(0, 2)}/${card.hash.slice(0, 4)}/${card.hash}`)}
                        alt={card.ext}
                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-[10px] text-text-tertiary uppercase">{card.ext}</span>
                      <span className="text-[10px] text-text-tertiary">{formatFileSize(card.size)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Bento Grid content */}
          <section className="mt-8">
            <h2 className="mb-4 font-display text-xl"><CreatorStrings which="recentWorks" /></h2>
            <Suspense fallback={<ContentGridSkeleton />}>
              <CreatorContentGrid service={service} creatorId={creatorId} />
            </Suspense>
          </section>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Navbar
// ============================================================

// ============================================================
// Banner — Editorial with cover image + avatar
// ============================================================
function Banner({
  creator,
  linkedAccounts,
  service,
  creatorId,
}: {
  creator: { name: string; service: string; id: string };
  linkedAccounts: LinkedAccount[];
  service: string;
  creatorId: string;
}) {
  const color = getServiceColor(creator.service);
  const bannerUrl = getCreatorBannerUrl(service, creatorId);
  const avatarUrl = getCreatorAvatarUrl(service, creatorId);

  return (
    <div className="relative overflow-hidden">
      {/* Cover image background */}
      <div className="absolute inset-0 h-72">
        <SafeImage
          src={bannerUrl}
          alt=""
          className="h-full w-full object-cover opacity-30 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-0" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar with graceful fallback */}
            <SafeImage
              src={avatarUrl}
              alt={creator.name}
              className="h-16 w-16 shrink-0 rounded-full border-2 border-white/10 bg-surface-1 object-cover sm:h-20 sm:w-20"
              fallback={
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/10 text-lg font-bold sm:h-20 sm:w-20"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {creator.name.slice(0, 2).toUpperCase()}
                </div>
              }
            />

            <div>
              {/* Platform badge */}
              <span
                className="neo-badge mb-3 inline-block rounded-lg px-3 py-1 text-xs font-bold"
                style={{ color }}
              >
                {getServiceLabel(creator.service)}
              </span>
              <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                {creator.name}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                <CreatorStrings which="creatorId" vars={{ id: creator.id }} />
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            {/* Follow button */}
            <FavoriteButton kind="creator" service={service} creatorId={creatorId} />

            {/* Linked accounts */}
            {linkedAccounts.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {linkedAccounts.map((acc) => {
                  const accColor = getServiceColor(acc.service);
                  return (
                    <Link
                      key={`${acc.service}:${acc.id}`}
                      href={`/${acc.service}/user/${acc.id}`}
                      className="neo-badge rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                      style={{ color: accColor }}
                    >
                      {getServiceLabel(acc.service)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Stats Bar — Fluent Design 2
// ============================================================
function StatsBar({
  service,
  linkedCount,
}: {
  service: string;
  creatorId: string;
  linkedCount: number;
}) {
  return (
    <div className="-mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="glass rounded-xl p-3 sm:p-4">
        <p className="text-lg font-bold sm:text-2xl">{getServiceLabel(service)}</p>
        <p className="text-xs text-text-tertiary"><CreatorStrings which="statsPlatform" /></p>
      </div>
      <div className="glass rounded-xl p-3 sm:p-4">
        <p className="text-lg font-bold sm:text-2xl">{String(linkedCount)}</p>
        <p className="text-xs text-text-tertiary"><CreatorStrings which="statsLinked" /></p>
      </div>
    </div>
  );
}

// ============================================================
// Content Grid — Bento
// ============================================================
async function CreatorContentGrid({
  service,
  creatorId,
}: {
  service: string;
  creatorId: string;
}) {
  let posts: Post[] = [];
  try {
    posts = await getCreatorPosts(service, creatorId, { o: 0 });
  } catch {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-text-secondary"><CreatorStrings which="contentError" /></p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-text-secondary"><CreatorStrings which="emptyContent" /></p>
      </div>
    );
  }

  return <CreatorPostsPager service={service} creatorId={creatorId} initialPosts={posts} />;
}

function CreatorPostCard({ post, index }: { post: Post; index: number }) {
  const thumb = getThumbnailUrl(post);
  const color = getServiceColor(post.service);

  return (
    <Link
      href={`/${post.service}/user/${post.user}/post/${post.id}`}
      className="card-md3 group flex flex-col fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative overflow-hidden bg-surface-3">
        <img
          src={thumb}
          alt={post.title}
          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
          loading="lazy"
          style={{ aspectRatio: "3/4" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-xs font-medium leading-snug">
          {post.title || "Untitled"}
        </h3>
        <p className="text-[10px] text-text-tertiary">
          {formatRelativeDate(post.published)}
        </p>
      </div>
    </Link>
  );
}

function ContentGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="card-md3">
          <div className="skeleton" style={{ aspectRatio: "3/4" }} />
          <div className="space-y-2 p-2.5">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-2 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
