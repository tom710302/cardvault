import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const game = searchParams.get("game") ?? "";
  const condition = searchParams.get("condition") ?? "";

  if (!q || q.length < 1) return NextResponse.json({ haves: [], wants: [] });

  const admin = createAdminClient();

  let havesQuery = admin
    .from("trade_haves")
    .select("id, card_name, card_game, condition, image_url, note, profiles(id, username, display_name, avatar_url)")
    .ilike("card_name", `%${q}%`)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(30);

  let wantsQuery = admin
    .from("trade_wants")
    .select("id, card_name, card_game, condition_min, note, profiles(id, username, display_name, avatar_url)")
    .ilike("card_name", `%${q}%`)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (game) {
    havesQuery = havesQuery.eq("card_game", game);
    wantsQuery = wantsQuery.eq("card_game", game);
  }

  if (condition) {
    havesQuery = havesQuery.eq("condition", condition);
    wantsQuery = wantsQuery.eq("condition_min", condition);
  }

  const [{ data: haves }, { data: wants }] = await Promise.all([havesQuery, wantsQuery]);

  return NextResponse.json({ haves: haves ?? [], wants: wants ?? [] });
}
