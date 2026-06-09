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
