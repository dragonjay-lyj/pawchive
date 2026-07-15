import type { Metadata } from "next";
import { ContentFeed } from "@/app/_components/ContentFeed";
import { SiteNav } from "@/app/_components/SiteNav";
import { SITE_NAME } from "@/lib/site";

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

export default async function ManagePage() {
  let initialPosts = [];
  try {
    const siteUrl = process.env.PAWCHIVE_SITE_URL
      ?? process.env.NEXT_PUBLIC_SITE_URL
      ?? "http://localhost:3000";
    const res = await fetch(`${siteUrl}/api/posts/public`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      initialPosts = json.posts ?? [];
    }
  } catch {
    // Fall back to empty list — client can retry
  }

  return (
    <div className="min-h-screen">
      <SiteNav active="manage" />
      <ContentFeed initialPosts={initialPosts} />
    </div>
  );
}
