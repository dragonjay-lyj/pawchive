import { Suspense } from "react";
import { getRecentPosts } from "@/lib/api";
import type { Post } from "@/lib/types";
import { PostFeed } from "./_components/PostFeed";
import { SiteNav } from "./_components/SiteNav";
import {
  HomeHero,
  HomeAnnouncementBar,
  HomePlatformPills,
  HomeLatestHeader,
} from "./_components/HomeSections";

export const dynamic = "force-dynamic";
export const revalidate = 60;

// ============================================================
// Home Page — Dark Minimal + Bento Grid + Neo-Brutalism
// ============================================================

export default async function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-6 lg:px-8">
        <section className="mb-16 mt-6">
          <HomeHero />
        </section>

        <HomeAnnouncementBar />

        <section className="mb-16">
          <HomePlatformPills />
        </section>

        <section>
          <HomeLatestHeader />
          <Suspense fallback={<PostGridSkeleton />}>
            <PostWaterfall />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

async function PostWaterfall() {
  let posts: Post[] = [];
  try {
    posts = await getRecentPosts({ o: 0 });
  } catch {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-text-secondary">Unable to load posts right now.</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-text-secondary">No posts found.</p>
      </div>
    );
  }

  return <PostFeed initialPosts={posts} />;
}

function PostGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="card-md3 flex flex-col">
          <div className="skeleton aspect-[3/4]" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-2 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
