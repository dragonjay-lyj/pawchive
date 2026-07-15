import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** GET /api/posts/[postId]/comments */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ comments: data ?? [] });
}

/** POST /api/posts/[postId]/comments */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createServerSupabase();
  let body: { author_name?: string; author_email?: string; content?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "content-required" }, { status: 400 });
  }

  const { data: auth } = await supabase.auth.getUser();

  const row: Record<string, unknown> = {
    post_id: postId,
    content,
    author_name: body.author_name?.trim() || null,
    author_email: body.author_email?.trim() || null,
  };

  if (auth.user) {
    row.user_id = auth.user.id;
    // Use profile username if available
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", auth.user.id)
      .single();
    if (profile?.username && !row.author_name) {
      row.author_name = profile.username;
    }
  }

  const { data, error } = await supabase
    .from("post_comments")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data });
}
