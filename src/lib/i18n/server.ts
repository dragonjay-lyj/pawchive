// Server-side locale detection based on cookie, Accept-Language and edge IP headers.
import { cookies, headers } from "next/headers";
import { LOCALES, type Locale } from "./dict";

const CHINA_LIKE = new Set(["CN", "HK", "MO", "TW", "SG"]);

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export async function detectLocaleFromRequest(): Promise<Locale> {
  try {
    const c = await cookies();
    const stored = c.get("pawchive_locale")?.value;
    if (isLocale(stored)) return stored;
  } catch {}

  try {
    const h = await headers();

    const country =
      h.get("cf-ipcountry") ??
      h.get("x-vercel-ip-country") ??
      h.get("x-country") ??
      "";
    if (country && CHINA_LIKE.has(country.toUpperCase())) return "zh";

    const accept = h.get("accept-language") ?? "";
    const parts = accept
      .split(",")
      .map((p) => p.trim().split(";")[0].toLowerCase());
    for (const p of parts) {
      if (p.startsWith("zh")) return "zh";
      if (p.startsWith("en")) return "en";
    }
  } catch {}

  return "en";
}
