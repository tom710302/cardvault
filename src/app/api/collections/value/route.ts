import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ total_value: 0, card_prices: {}, priced_count: 0 });

  const { data: collections } = await supabase
    .from("collections")
    .select("card_id, quantity")
    .eq("user_id", user.id)
    .not("card_id", "is", null);

  if (!collections?.length) return NextResponse.json({ total_value: 0, card_prices: {}, priced_count: 0 });

  const cardIds = Array.from(new Set(collections.map((c: any) => c.card_id)));

  const { data: prices } = await supabase
    .from("price_reports")
    .select("card_id, price")
    .in("card_id", cardIds);

  // Group prices by card_id and compute average
  const grouped: Record<string, number[]> = {};
  for (const p of (prices ?? []) as any[]) {
    if (!grouped[p.card_id]) grouped[p.card_id] = [];
    grouped[p.card_id].push(p.price);
  }

  const card_prices: Record<string, number> = {};
  for (const [cardId, list] of Object.entries(grouped)) {
    card_prices[cardId] = Math.round(list.reduce((s, v) => s + v, 0) / list.length);
  }

  let total_value = 0;
  for (const col of collections as any[]) {
    if (col.card_id && card_prices[col.card_id]) {
      total_value += card_prices[col.card_id] * (col.quantity ?? 1);
    }
  }

  return NextResponse.json({
    total_value,
    card_prices,
    priced_count: Object.keys(card_prices).length,
  });
}
