import { NextResponse } from "next/server";

/** POST /api/admin/password — use Supabase account management instead */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Use Supabase email/password management in Settings > Account" },
    { status: 400 }
  );
}
