import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** GET /api/favorites?type=creator|post — list user's favorites */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "post";

  const query = supabase
    .from("favorites")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (type === "creator" || type === "post") {
    query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorites: data });
}

/** POST /api/favorites — add a favorite */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: {
    type: "creator" | "post";
    service: string;
    creator_id: string;
    post_id?: string;
    title?: string;
    creator_name?: string;
    thumb_url?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  if (!body.type || !body.service || !body.creator_id) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: auth.user.id,
        type: body.type,
        service: body.service,
        creator_id: body.creator_id,
        post_id: body.post_id ?? null,
        title: body.title ?? null,
        creator_name: body.creator_name ?? null,
        thumb_url: body.thumb_url ?? null,
      },
      { onConflict: "user_id, service, creator_id, post_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorite: data });
}

/** DELETE /api/favorites — remove a favorite */
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
    .from("favorites")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
