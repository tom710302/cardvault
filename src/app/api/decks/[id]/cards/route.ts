import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function assertOwner(deckId: string, userId: string, admin: any) {
  const { data } = await admin.from("decks").select("user_id").eq("id", deckId).single();
  return data?.user_id === userId;
}

// Full sync: replace all deck cards atomically
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  if (!await assertOwner(params.id, user.id, admin))
    return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { cards } = await request.json() as { cards: any[] };

  await admin.from("deck_cards").delete().eq("deck_id", params.id);

  if (cards?.length > 0) {
    const { error } = await admin.from("deck_cards").insert(
      cards.map(c => ({
        deck_id: params.id,
        card_id: c.card_id ?? null,
        card_name: c.card_name,
        card_game: c.card_game,
        image_url: c.image_url ?? null,
        quantity: Math.min(4, c.quantity ?? 1),
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  if (!await assertOwner(params.id, user.id, admin))
    return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { card_id, card_name, card_game, image_url, quantity } = await request.json();
  if (!card_name) return NextResponse.json({ error: "缺少卡牌名稱" }, { status: 400 });

  const { data: existing } = await admin
    .from("deck_cards").select("id, quantity")
    .eq("deck_id", params.id).eq("card_name", card_name).maybeSingle();

  if (existing) {
    const newQty = Math.min(4, (existing.quantity ?? 1) + (quantity ?? 1));
    await admin.from("deck_cards").update({ quantity: newQty }).eq("id", existing.id);
    return NextResponse.json({ quantity: newQty });
  }

  const { data, error } = await admin.from("deck_cards").insert({
    deck_id: params.id, card_id: card_id ?? null, card_name, card_game,
    image_url: image_url || null, quantity: Math.min(4, quantity ?? 1),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data }, { status: 201 });
}
