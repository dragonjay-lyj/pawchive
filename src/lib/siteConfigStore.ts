// ============================================================
// Server-side site config — settings that apply to every visitor
// (unlike user prefs which live in localStorage). Persisted to
// .data/site-config.json, mutable only via admin API.
// ============================================================

import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "site-config.json");

export interface SiteConfig {
  translationBaseUrl: string;
  translationApiKey: string;
  aiSearchEndpoint: string;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  translationBaseUrl: "",
  translationApiKey: "",
  aiSearchEndpoint: "",
};

async function readStored(): Promise<SiteConfig> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteConfig>;
    return { ...DEFAULT_SITE_CONFIG, ...parsed };
  } catch { return { ...DEFAULT_SITE_CONFIG }; }
}

async function writeStored(next: SiteConfig): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
}

export async function readSiteConfig(): Promise<SiteConfig> {
  return readStored();
}

/** Return the shape that's safe to expose to unauthenticated clients. */
export function toPublicSiteConfig(c: SiteConfig) {
  return {
    translationBaseUrl: c.translationBaseUrl,
    // API key is redacted in public form — server proxies translate reqs anyway
    hasTranslationApiKey: !!c.translationApiKey,
    aiSearchEndpoint: c.aiSearchEndpoint,
  };
}

export async function updateSiteConfig(patch: Partial<SiteConfig>): Promise<SiteConfig> {
  const cur = await readStored();
  const next: SiteConfig = { ...cur, ...patch };
  await writeStored(next);
  return next;
}
