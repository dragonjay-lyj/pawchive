// ============================================================
// Site-wide constants used in metadata / SEO
// Configure via PAWCHIVE_SITE_URL env; falls back to localhost
// during dev so Metadata works without extra config.
// ============================================================

export const SITE_NAME = "Pawchive";
export const SITE_TAGLINE_EN =
  "Public archive for Patreon, Fanbox, Fantia, SubscribeStar, Discord, Gumroad, Boosty and Afdian creators.";
export const SITE_TAGLINE_ZH =
  "Patreon、Fanbox、Fantia、SubscribeStar、Discord、Gumroad、Boosty、爱发电 创作者内容公开归档站。";

export function getSiteUrl(): string {
  const raw = process.env.PAWCHIVE_SITE_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

// Static URL list for sitemap; dynamic content (creators/posts) is
// not enumerated because there are millions of posts. We surface
// the entry pages and let crawlers follow links from there.
export const STATIC_ROUTES: { path: string; changeFrequency: "hourly" | "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "hourly", priority: 1.0 },
  { path: "/browse", changeFrequency: "hourly", priority: 0.9 },
  { path: "/search", changeFrequency: "weekly", priority: 0.7 },
  { path: "/creators", changeFrequency: "daily", priority: 0.9 },
  { path: "/hash-lookup", changeFrequency: "monthly", priority: 0.4 },
  { path: "/importer", changeFrequency: "monthly", priority: 0.5 },
  { path: "/importer/tutorial", changeFrequency: "monthly", priority: 0.4 },
  { path: "/favorites", changeFrequency: "monthly", priority: 0.2 },
  { path: "/settings", changeFrequency: "monthly", priority: 0.2 },
];
