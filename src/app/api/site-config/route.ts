import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../admin/login/route";
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
  const token = req.cookies.get("pawchive_admin")?.value;
  const claim = token ? verifyToken(token) : null;
  if (!claim) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
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
