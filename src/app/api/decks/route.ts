import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const userId = searchParams.get("user_id");
  const mine = searchParams.get("mine");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = admin
    .from("decks")
    .select("*, profiles(username, display_name, avatar_url), deck_cards(count)")
    .order("created_at", { ascending: false })
    .limit(40);

  if (mine === "1" && user) {
    query = query.eq("user_id", user.id);
  } else {
    query = query.eq("is_public", true);
    if (userId) query = query.eq("user_id", userId);
  }
  if (game && game !== "全部") query = query.eq("game", game);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ decks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { name, game, description, is_public } = await request.json();
  if (!name?.trim() || !game) return NextResponse.json({ error: "請填寫卡組名稱與遊戲" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("decks").insert({
    user_id: user.id,
    name: name.trim(),
    game,
    description: description?.trim() || null,
    is_public: is_public ?? true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deck: data }, { status: 201 });
}
