import { NextRequest, NextResponse } from "next/server";

/** GET /api/search-upstream?q=xxx — proxies pawchive.pw/posts?q= search */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const res = await fetch(`https://pawchive.pw/posts?q=${encodeURIComponent(q.trim())}`, {
      headers: {
        Accept: "application/json, text/html",
        "User-Agent": "Pawchive/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ posts: [], error: `upstream-${res.status}` });
    }

    const contentType = res.headers.get("content-type") ?? "";

    // Try JSON first
    if (contentType.includes("application/json")) {
      const json = await res.json();
      const posts = Array.isArray(json) ? json : Array.isArray(json?.posts) ? json.posts : Array.isArray(json?.data) ? json.data : [];
      return NextResponse.json({ posts });
    }

    // Fallback: HTML scraping — extract post info
    const html = await res.text();
    const posts = extractPostsFromHtml(html);
    return NextResponse.json({ posts });

  } catch (e) {
    return NextResponse.json({ posts: [], error: e instanceof Error ? e.message : "network" });
  }
}

/** Naive HTML scraper for pawchive.pw search results page. */
function extractPostsFromHtml(html: string): unknown[] {
  const posts: unknown[] = [];
  // pawchive.pw search results typically render as cards/rows with post IDs
  // Extract any post-id patterns (digits) and link URLs
  const cardRegex = /<a[^>]*href=["']?\/([a-z]+)\/user\/([^"'/\s]+)\/post\/([a-zA-Z0-9]+)["']?[^>]*>/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    posts.push({
      service: match[1],
      user: match[2],
      id: match[3],
    });
  }
  return posts;
}
