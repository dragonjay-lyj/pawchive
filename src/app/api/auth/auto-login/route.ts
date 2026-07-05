import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createHash } from "node:crypto";

// ============================================================
// Auto-login: when a user logs in to pawchive.pw, we create
// or find their Supabase account and sign them in automatically.
// Email: pw_<session_hash>@pawchive.local
// Password: the full session cookie (deterministic per session)
// ============================================================

export async function POST(req: NextRequest) {
  let body: { session?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const session = body.session?.trim();
  if (!session) {
    return NextResponse.json({ error: "missing-session" }, { status: 400 });
  }

  // Derive deterministic credentials from the session cookie
  const hash = createHash("sha256").update(session).digest("hex").slice(0, 16);
  const email = `pw_${hash}@pawchive.local`;
  const password = session;

  const supabase = await createServerSupabase();

  // Try signing in first (existing user)
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Create new account
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 500 });
    }
    // Sign in after signup
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
