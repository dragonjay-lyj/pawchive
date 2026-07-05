import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** GET /api/admin/status — check if current Supabase user is admin */
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ ok: false });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .single();

  if (profile?.is_admin) {
    return NextResponse.json({ ok: true, user: auth.user.email });
  }

  return NextResponse.json({ ok: false });
}
