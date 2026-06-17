import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data, error } = await supabase
    .from("post_bookmarks")
    .select("post_id, posts(id, title, content, board, post_type, upvotes, view_count, created_at, image_urls, tags, profiles(username, avatar_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookmarks: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { post_id } = await request.json();
  if (!post_id) return NextResponse.json({ error: "post_id 必填" }, { status: 400 });

  const { error } = await supabase
    .from("post_bookmarks")
    .insert({ user_id: user.id, post_id });

  if (error?.code === "23505") return NextResponse.json({ error: "已收藏過" }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { post_id } = await request.json();

  const { error } = await supabase
    .from("post_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", post_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
