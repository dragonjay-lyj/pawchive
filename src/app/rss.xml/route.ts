import { SITE_NAME, getSiteUrl } from "@/lib/site";

interface PostItem {
  id: string;
  title?: string;
  content?: string;
  service?: string;
  created_at?: string;
  published?: string;
  user_id?: string;
  profiles?: { username?: string } | null;
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const posts = await fetchCommunityPosts(siteUrl);

  const items = posts
    .map(
      (p: PostItem) => `    <item>
      <title><![CDATA[${escapeXml(p.title ?? "Untitled")}]]></title>
      <link>${siteUrl}/manage/${p.id}</link>
      <guid isPermaLink="true">${siteUrl}/manage/${p.id}</guid>
      <description><![CDATA[${escapeXml(p.content?.slice(0, 500) ?? "")}]]></description>
      <author>${escapeXml(p.profiles?.username ?? p.user_id?.slice(0, 8) ?? "anonymous")}</author>
      <pubDate>${new Date(p.created_at ?? p.published ?? Date.now()).toUTCString()}</pubDate>
      <category>${escapeXml(p.service ?? "")}</category>
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} Community Posts</title>
    <link>${siteUrl}/manage</link>
    <description>Community-contributed posts with download links and resources across Patreon, Fanbox, Fantia, and more.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

async function fetchCommunityPosts(siteUrl: string): Promise<PostItem[]> {
  try {
    const res = await fetch(`${siteUrl}/api/posts/public`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.posts ?? []).slice(0, 50);
  } catch {
    return [];
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
