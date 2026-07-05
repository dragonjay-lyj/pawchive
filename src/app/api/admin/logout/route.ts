import { NextResponse } from "next/server";

/** POST /api/admin/logout — clear old HMAC cookie (kept for migration) */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pawchive_admin", "", { maxAge: 0, path: "/" });
  return res;
}
