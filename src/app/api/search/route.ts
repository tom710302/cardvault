import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q || q.length < 2) return NextResponse.json({ cards: [], posts: [], users: [] });

  const [cards, posts, users] = await Promise.all([
    supabase.from("cards").select("id, name, name_en, game, rarity").ilike("name", `%${q}%`).limit(5),
    supabase.from("posts").select("id, title, board, post_type").ilike("title", `%${q}%`).eq("is_deleted", false).limit(5),
    supabase.from("profiles").select("id, username, display_name, avatar_url").ilike("username", `%${q}%`).limit(3),
  ]);

  return NextResponse.json({
    cards: cards.data ?? [],
    posts: posts.data ?? [],
    users: users.data ?? [],
  });
}
