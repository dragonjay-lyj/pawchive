// ============================================================
// Server-side site config — stored in Supabase site_config table.
// Admin writes via service_role client; everyone reads via anon.
// ============================================================

import { createClient } from "@supabase/supabase-js";

export interface SiteConfig {
  translationBaseUrl: string;
  translationApiKey: string;
  aiSearchEndpoint: string;
}

const DEFAULT_SITE_CONFIG: SiteConfig = {
  translationBaseUrl: "",
  translationApiKey: "",
  aiSearchEndpoint: "",
};

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function readSiteConfig(): Promise<SiteConfig> {
  try {
    const supabase = getAnonClient();
    const { data } = await supabase
      .from("site_config")
      .select("translation_base_url, translation_api_key, ai_search_endpoint")
      .eq("id", 1)
      .single();

    if (data) {
      return {
        translationBaseUrl: data.translation_base_url ?? "",
        translationApiKey: data.translation_api_key ?? "",
        aiSearchEndpoint: data.ai_search_endpoint ?? "",
      };
    }
  } catch { /* fall through to default */ }

  return { ...DEFAULT_SITE_CONFIG };
}

/** Return the shape that's safe to expose to unauthenticated clients. */
export function toPublicSiteConfig(c: SiteConfig) {
  return {
    translationBaseUrl: c.translationBaseUrl,
    hasTranslationApiKey: !!c.translationApiKey,
    aiSearchEndpoint: c.aiSearchEndpoint,
  };
}

export async function updateSiteConfig(patch: Partial<SiteConfig>): Promise<SiteConfig> {
  const supabase = getServiceClient();

  const row: Record<string, string> = { updated_at: new Date().toISOString() };
  if (typeof patch.translationBaseUrl === "string") row.translation_base_url = patch.translationBaseUrl;
  if (typeof patch.translationApiKey === "string") row.translation_api_key = patch.translationApiKey;
  if (typeof patch.aiSearchEndpoint === "string") row.ai_search_endpoint = patch.aiSearchEndpoint;

  const { data, error } = await supabase
    .from("site_config")
    .upsert({ id: 1, ...row })
    .select("translation_base_url, translation_api_key, ai_search_endpoint")
    .single();

  if (error || !data) {
    // Fallback if Supabase is unavailable — return merged patch
    const current = await readSiteConfig();
    return { ...current, ...patch };
  }

  return {
    translationBaseUrl: data.translation_base_url ?? "",
    translationApiKey: data.translation_api_key ?? "",
    aiSearchEndpoint: data.ai_search_endpoint ?? "",
  };
}
