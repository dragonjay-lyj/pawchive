import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** GET /api/posts/public?id=xxx OR ?service=xxx&creator_id=xxx */
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data } = await supabase
      .from("user_posts")
      .select("*, post_attachments(*), profiles!user_posts_user_id_fkey(username)")
      .eq("id", id)
      .single();
    return NextResponse.json({ post: data ?? null });
  }

  const service = req.nextUrl.searchParams.get("service");
  const creatorId = req.nextUrl.searchParams.get("creator_id");

  let query = supabase
    .from("user_posts")
    .select("*, post_attachments(*), profiles!user_posts_user_id_fkey(username)")
    .order("created_at", { ascending: false });

  if (service) query = query.eq("service", service);
  if (creatorId) query = query.eq("creator_id", creatorId);

  const { data } = await query;

  return NextResponse.json({ posts: data ?? [] });
}
