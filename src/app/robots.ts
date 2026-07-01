import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",             // API + proxy — no crawlable content
          "/settings",         // per-user
          "/favorites",        // per-user
        ],
      },
      // Give Bingbot the same rules explicitly — some setups
      // treat "*" more loosely than named agents.
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/settings", "/favorites"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
