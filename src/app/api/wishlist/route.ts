import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ wishlist: [] });

  const { data } = await supabase
    .from("wishlists")
    .select("*, cards(id, name, game, rarity, set_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ wishlist: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { card_id, max_price, notes } = await request.json();
  const { data, error } = await supabase
    .from("wishlists")
    .upsert({ user_id: user.id, card_id, max_price, notes })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { card_id } = await request.json();
  await supabase.from("wishlists").delete().eq("user_id", user.id).eq("card_id", card_id);
  return NextResponse.json({ success: true });
}
