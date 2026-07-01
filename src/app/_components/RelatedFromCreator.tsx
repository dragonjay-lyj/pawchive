import Link from "next/link";
import {
  getCreatorPosts,
  getThumbnailUrl,
  getServiceColor,
} from "@/lib/api";
import type { Post } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

interface Props {
  service: string;
  creatorId: string;
  excludePostId?: string;
  limit?: number;
}

export async function RelatedFromCreator({
  service,
  creatorId,
  excludePostId,
  limit = 6,
}: Props) {
  let posts: Post[] = [];
  try {
    posts = await getCreatorPosts(service, creatorId, { o: 0 });
  } catch {
    return (
      <p className="text-sm text-text-tertiary">
        Unable to load related posts.
      </p>
    );
  }

  const filtered = posts
    .filter((p) => p.id !== excludePostId)
    .slice(0, limit);

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-text-tertiary">
        No other posts from this creator yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
      {filtered.map((post) => {
        const color = getServiceColor(post.service);
        return (
          <Link
            key={post.id}
            href={`/${post.service}/user/${post.user}/post/${post.id}`}
            className="card-md3 group flex flex-col"
          >
            <div className="relative overflow-hidden bg-surface-3" style={{ aspectRatio: "3/4" }}>
              <img
                src={getThumbnailUrl(post)}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="p-2.5">
              <h4 className="line-clamp-2 text-xs font-medium leading-snug">
                {post.title || "Untitled"}
              </h4>
              <p className="mt-1 text-[10px] text-text-tertiary">
                {formatRelativeDate(post.published)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
