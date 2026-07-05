// ============================================================
// Server-side site config — stored in Supabase site_config table.
// Public read via anon client; admin write via authenticated user
// (RLS policy checks profiles.is_admin).
// ============================================================

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Return the shape safe to expose to unauthenticated clients. */
export function toPublicSiteConfig(c: SiteConfig) {
  return {
    translationBaseUrl: c.translationBaseUrl,
    hasTranslationApiKey: !!c.translationApiKey,
    aiSearchEndpoint: c.aiSearchEndpoint,
  };
}

/**
 * Write site config via an authenticated admin Supabase client.
 * RLS policy on site_config checks profiles.is_admin.
 */
export async function updateSiteConfig(
  patch: Partial<SiteConfig>,
  supabase: SupabaseClient
): Promise<SiteConfig> {
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
    throw new Error(error?.message ?? "Failed to write site config");
  }

  return {
    translationBaseUrl: data.translation_base_url ?? "",
    translationApiKey: data.translation_api_key ?? "",
    aiSearchEndpoint: data.ai_search_endpoint ?? "",
  };
}
