import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** POST /api/posts/[postId]/thanks — toggle thanks (like) */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("post_thanks")
    .insert({ post_id: postId, user_id: auth.user.id });

  if (error) {
    if (error.code === "23505") {
      await supabase.from("post_thanks").delete().eq("post_id", postId).eq("user_id", auth.user.id);
      // Decrement
      const { data: cur } = await supabase.from("user_posts").select("thanks_count").eq("id", postId).single();
      if (cur) await supabase.from("user_posts").update({ thanks_count: Math.max(0, (cur.thanks_count ?? 1) - 1) }).eq("id", postId);
      return NextResponse.json({ ok: true, action: "removed" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment
  const { data: cur } = await supabase.from("user_posts").select("thanks_count").eq("id", postId).single();
  if (cur) await supabase.from("user_posts").update({ thanks_count: (cur.thanks_count ?? 0) + 1 }).eq("id", postId);

  return NextResponse.json({ ok: true, action: "added" });
}
