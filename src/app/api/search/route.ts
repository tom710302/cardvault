import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q || q.length < 2) return NextResponse.json({ cards: [], posts: [], users: [], trades: [] });

  const [cards, cardsByEn, posts, users, tradeHaves] = await Promise.all([
    supabase.from("cards").select("id, name, name_en, game, rarity").ilike("name", `%${q}%`).limit(5),
    supabase.from("cards").select("id, name, name_en, game, rarity").ilike("name_en", `%${q}%`).limit(5),
    supabase.from("posts").select("id, title, board, post_type").ilike("title", `%${q}%`).eq("is_deleted", false).limit(5),
    supabase.from("profiles").select("id, username, display_name, avatar_url").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(3),
    supabase.from("trade_haves").select("card_name, card_game").ilike("card_name", `%${q}%`).eq("is_active", true).limit(3),
  ]);

  // Merge card results deduped by id
  const cardMap = new Map<string, any>();
  for (const c of [...(cards.data ?? []), ...(cardsByEn.data ?? [])]) cardMap.set(c.id, c);

  // Aggregate trade hint: unique card names found
  const tradeNames = Array.from(new Set((tradeHaves.data ?? []).map((h: any) => h.card_name)));

  return NextResponse.json({
    cards: Array.from(cardMap.values()).slice(0, 5),
    posts: posts.data ?? [],
    users: users.data ?? [],
    trades: tradeNames.slice(0, 3),
  });
}
