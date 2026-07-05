import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** GET /api/posts — list user's managed posts */
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_posts")
    .select("*, post_attachments(*)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data });
}

/** POST /api/posts — create or update a post */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: {
    id?: string;          // if present, update existing
    service: string;
    creator_id: string;
    post_id?: string;     // upstream id (null = brand new)
    title: string;
    content?: string;
    published?: string;
    is_new?: boolean;
    attachments?: {
      name: string;
      url?: string;
      file_path?: string;
      size?: number;
    }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  if (!body.service || !body.creator_id || !body.title) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const postRow = {
    user_id: auth.user.id,
    service: body.service,
    creator_id: body.creator_id,
    post_id: body.post_id ?? null,
    title: body.title,
    content: body.content ?? null,
    published: body.published ?? null,
    is_new: body.is_new ?? (!body.post_id),
    updated_at: new Date().toISOString(),
  };

  let postId: string;

  if (body.id) {
    // Update existing
    const { data: updated, error } = await supabase
      .from("user_posts")
      .update(postRow)
      .eq("id", body.id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    postId = updated.id;
  } else {
    // Create new
    const { data: created, error } = await supabase
      .from("user_posts")
      .insert(postRow)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    postId = created.id;
  }

  // Handle attachments
  if (body.attachments && body.attachments.length > 0) {
    // Delete existing attachments and re-insert
    await supabase.from("post_attachments").delete().eq("post_id", postId);

    const rows = body.attachments.map((a) => ({
      post_id: postId,
      name: a.name,
      url: a.url ?? null,
      file_path: a.file_path ?? null,
      size: a.size ?? null,
    }));

    await supabase.from("post_attachments").insert(rows);
  }

  // Return the full post with attachments
  const { data: full } = await supabase
    .from("user_posts")
    .select("*, post_attachments(*)")
    .eq("id", postId)
    .single();

  return NextResponse.json({ post: full });
}

/** DELETE /api/posts?id=xxx — delete a post */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing-id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
