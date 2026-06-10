import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const game = searchParams.get("game");
  const search = searchParams.get("search");

  let query = supabase.from("stores").select("*").order("is_verified", { ascending: false }).order("name");

  if (city && city !== "全部") query = query.eq("city", city);
  if (game && game !== "全部") query = query.contains("games", [game]);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { name, address, city, phone, website, hours, description, games, image_url } = body;
  if (!name || !address || !city) return NextResponse.json({ error: "店名、地址、城市為必填" }, { status: 400 });

  const { data, error } = await supabase.from("stores")
    .insert({ name, address, city, phone, website, hours, description, games: games ?? [], image_url: image_url || null, submitted_by: user.id, is_verified: false })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store: data }, { status: 201 });
}
