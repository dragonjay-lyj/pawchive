import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** GET /api/profile — get current user profile */
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  return NextResponse.json({
    user: auth.user,
    profile,
  });
}

/** PATCH /api/profile — update pawchive_session or username */
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { pawchive_session?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (typeof body.pawchive_session === "string") {
    patch.pawchive_session = body.pawchive_session;
  }
  if (typeof body.username === "string" && body.username.trim()) {
    patch.username = body.username.trim();
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", auth.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
