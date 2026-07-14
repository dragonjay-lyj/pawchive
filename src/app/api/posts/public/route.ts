import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** GET /api/posts/public?service=xxx&creator_id=xxx — public view of user posts */
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get("service");
  const creatorId = req.nextUrl.searchParams.get("creator_id");

  if (!service || !creatorId) {
    return NextResponse.json({ posts: [] });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("user_posts")
    .select("*, post_attachments(*)")
    .eq("service", service)
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ posts: data ?? [] });
}
