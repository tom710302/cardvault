import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: deck, error } = await admin
    .from("decks")
    .select("*, profiles(id, username, display_name, avatar_url)")
    .eq("id", params.id)
    .single();

  if (error || !deck) return NextResponse.json({ error: "找不到卡組" }, { status: 404 });

  const { data: cards } = await admin
    .from("deck_cards")
    .select("*, cards(id, name, game, rarity, set_name, image_url)")
    .eq("deck_id", params.id)
    .order("created_at");

  // Increment view count (fire and forget)
  admin.from("decks").update({ view_count: (deck.view_count ?? 0) + 1 }).eq("id", params.id);

  return NextResponse.json({ deck, cards: cards ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();
  const { error } = await admin
    .from("decks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("decks").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
