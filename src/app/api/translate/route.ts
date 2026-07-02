import { NextRequest, NextResponse } from "next/server";
import { readSiteConfig } from "@/lib/siteConfigStore";

// ============================================================
// Server-side DeepLX proxy — reads the admin-configured endpoint
// + API key from .data/site-config.json so every visitor can use
// translation without exposing the key.
// ============================================================

function buildUrl(baseUrl: string, apiKey: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("not-configured");

  if (trimmed.includes("{{apiKey}}")) {
    if (!apiKey) throw new Error("api-key-required");
    return trimmed.replace(/\{\{apiKey\}\}/g, encodeURIComponent(apiKey));
  }

  try {
    const u = new URL(trimmed);
    if (u.hostname === "api.deeplx.org") {
      return apiKey
        ? `https://api.deeplx.org/${encodeURIComponent(apiKey)}/translate`
        : `https://api.deeplx.org/translate`;
    }
  } catch { /* fall through */ }

  if (/\/translate($|\?)/.test(trimmed)) return trimmed;
  return apiKey
    ? `${trimmed}/${encodeURIComponent(apiKey)}/translate`
    : `${trimmed}/translate`;
}

export async function POST(req: NextRequest) {
  let body: { text?: string; source_lang?: string; target_lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const text = String(body?.text ?? "");
  const source = String(body?.source_lang ?? "auto").toUpperCase();
  const target = String(body?.target_lang ?? "").toUpperCase();
  if (!text || !target) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const config = await readSiteConfig();
  if (!config.translationBaseUrl) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = buildUrl(config.translationBaseUrl, config.translationApiKey);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "invalid-config" }, { status: 500 });
  }

  try {
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source_lang: source, target_lang: target }),
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      return NextResponse.json({ error: `upstream-${res.status}`, detail: raw.slice(0, 400) }, { status: 502 });
    }
    const json: unknown = await res.json();
    if (typeof json === "object" && json) {
      const obj = json as Record<string, unknown>;
      if (typeof obj.data === "string") return NextResponse.json({ data: obj.data });
      if (typeof obj.translated_text === "string") return NextResponse.json({ data: obj.translated_text });
      if (Array.isArray(obj.alternatives) && typeof (obj.alternatives as any[])[0] === "string") {
        return NextResponse.json({ data: (obj.alternatives as string[])[0] });
      }
    }
    return NextResponse.json({ error: "unexpected-response" }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "network" }, { status: 502 });
  }
}
