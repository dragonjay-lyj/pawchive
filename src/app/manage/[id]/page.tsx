import type { Metadata } from "next";
import { PostDetail } from "@/app/_components/PostDetail";
import { SiteNav } from "@/app/_components/SiteNav";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@supabase/supabase-js";

async function getPost(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("user_posts")
    .select("*, post_attachments(*), profiles!user_posts_user_id_fkey(username)")
    .eq("id", id)
    .single();

  return data ?? null;
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
