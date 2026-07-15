import type { Metadata } from "next";
import { ContentFeed } from "@/app/_components/ContentFeed";
import { SiteNav } from "@/app/_components/SiteNav";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: `Community Posts · ${SITE_NAME}`,
  description:
    "Community-contributed posts with download links, notes, and resources across Patreon, Fanbox, Fantia, and more.",
  openGraph: {
    title: `Community Posts · ${SITE_NAME}`,
    description:
      "Browse community posts with attachments and resources from creators across all platforms.",
    type: "website",
  },
};

async function fetchPosts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("user_posts")
    .select("*, post_attachments(*), profiles!user_posts_user_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(100);

  return data ?? [];
}

export default async function ManagePage() {
  const initialPosts = await fetchPosts();

  return (
    <div className="min-h-screen">
      <SiteNav active="manage" />
      <ContentFeed initialPosts={initialPosts} />
    </div>
  );
}
