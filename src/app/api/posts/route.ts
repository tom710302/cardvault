import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const board = searchParams.get("board");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("posts")
    .select(`*, profiles(username, display_name, avatar_url, reputation)`)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (board && board !== "all") query = query.eq("board", board);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { title, content, board, post_type, image_urls } = body;

  if (!title || !content) return NextResponse.json({ error: "標題和內容為必填" }, { status: 400 });

  const { data, error } = await supabase
    .from("posts")
    .insert({ title, content, board: board ?? "general", post_type: post_type ?? "discussion", author_id: user.id, image_urls: image_urls?.length ? image_urls : null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc("increment_reputation", { user_id: user.id, amount: 5 }).maybeSingle();
  return NextResponse.json({ post: data }, { status: 201 });
}
