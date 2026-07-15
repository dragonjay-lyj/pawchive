import type { Metadata } from "next";
import { PostDetail } from "@/app/_components/PostDetail";
import { SiteNav } from "@/app/_components/SiteNav";
import { SITE_NAME } from "@/lib/site";

async function getPost(id: string) {
  const siteUrl = process.env.PAWCHIVE_SITE_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? "http://localhost:3000";
  const res = await fetch(`${siteUrl}/api/posts/public?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.post ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: `Post · ${SITE_NAME}` };

  return {
    title: `${post.title} · Community · ${SITE_NAME}`,
    description: post.content?.slice(0, 160) ?? `Community post by ${post.profiles?.username ?? "user"}`,
    openGraph: {
      title: post.title,
      description: post.content?.slice(0, 200),
      type: "article",
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);

  return (
    <div className="min-h-screen">
      <SiteNav active="manage" />
      <PostDetail post={post} error={post ? null : "Post not found."} />
    </div>
  );
}
