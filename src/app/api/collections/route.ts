import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data, error } = await supabase
    .from("collections")
    .select(`*, cards(name, name_en, game, set_name, rarity, image_url)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { card_id, custom_name, condition, quantity, notes, image_url, visibility } = body;
  if (!card_id && !custom_name) return NextResponse.json({ error: "請選擇卡牌或輸入卡牌名稱" }, { status: 400 });

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      card_id: card_id || null,
      custom_name: custom_name || null,
      condition: condition ?? "NM",
      quantity: quantity ?? 1,
      notes: notes || null,
      image_url: image_url || null,
      visibility: visibility ?? "public",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { id, visibility } = await request.json();
  const { error } = await supabase.from("collections").update({ visibility }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { id } = await request.json();
  const { error } = await supabase.from("collections").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
