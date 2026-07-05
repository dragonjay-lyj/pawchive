import { NextResponse } from "next/server";

/** POST /api/admin/login — use Supabase auth instead (this is a no-op) */
export async function POST() {
  return NextResponse.json({ ok: false, error: "Use Supabase sign-in in Settings > Account" }, { status: 400 });
}
