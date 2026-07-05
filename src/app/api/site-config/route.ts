import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  readSiteConfig,
  toPublicSiteConfig,
  updateSiteConfig,
  type SiteConfig,
} from "@/lib/siteConfigStore";

export async function GET() {
  const config = await readSiteConfig();
  return NextResponse.json(toPublicSiteConfig(config));
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  // Check Supabase admin
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: Partial<SiteConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const patch: Partial<SiteConfig> = {};
  if (typeof body.translationBaseUrl === "string") patch.translationBaseUrl = body.translationBaseUrl.trim();
  if (typeof body.translationApiKey === "string") patch.translationApiKey = body.translationApiKey;
  if (typeof body.aiSearchEndpoint === "string") patch.aiSearchEndpoint = body.aiSearchEndpoint.trim();

  const next = await updateSiteConfig(patch);
  return NextResponse.json({ ok: true, config: toPublicSiteConfig(next) });
}
