import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyAdminCredentials } from "@/lib/adminStore";

// ============================================================
// Admin login endpoint
// Credentials come from adminStore (persisted file → env fallback).
// Session token is a signed HMAC of the username + issue time,
// stored as httpOnly cookie.
// ============================================================

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  return process.env.PAWCHIVE_ADMIN_SECRET || "pawchive-admin-dev-secret-change-me";
}

export function signToken(user: string, ts: number): string {
  const payload = `${user}.${ts}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { user: string; ts: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [user, tsStr, sig] = parts;
  const ts = Number(tsStr);
  if (!user || !Number.isFinite(ts)) return null;
  if (Date.now() / 1000 - ts > SESSION_MAX_AGE) return null;
  const expected = createHmac("sha256", getSecret()).update(`${user}.${ts}`).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch { return null; }
  return { user, ts };
}

export async function POST(req: NextRequest) {
  let body: { user?: string; pass?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const user = String(body?.user ?? "");
  const pass = String(body?.pass ?? "");

  const ok = await verifyAdminCredentials(user, pass);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = signToken(user, Math.floor(Date.now() / 1000));
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set("pawchive_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
