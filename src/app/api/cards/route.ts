import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const game = searchParams.get("game");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let query = supabase
    .from("cards")
    .select("*")
    .eq("is_active", true)
    .order("name")
    .limit(limit);

  if (search) query = query.ilike("name", `%${search}%`);
  if (game && game !== "全部") query = query.eq("game", game);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入後才能新增卡牌" }, { status: 401 });

  const body = await request.json();
  const { name, name_en, game, card_type, set_name, set_code, rarity, description, image_url } = body;
  if (!name || !game) return NextResponse.json({ error: "卡牌名稱和遊戲為必填" }, { status: 400 });

  const { data, error } = await supabase
    .from("cards")
    .insert({ name, name_en, game, card_type: card_type ?? "tcg", set_name, set_code, rarity, description, image_url: image_url || null, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data }, { status: 201 });
}
