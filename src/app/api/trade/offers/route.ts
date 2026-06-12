import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("trade_offers")
    .select("*, from_profile:from_user_id(id,username,display_name,avatar_url), to_profile:to_user_id(id,username,display_name,avatar_url)")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { to_user_id, offer_have_ids, request_have_ids, message } = await request.json();
  if (!to_user_id || !offer_have_ids?.length) return NextResponse.json({ error: "請選擇要提供的卡牌" }, { status: 400 });
  const admin = createAdminClient();
  const { data: offer, error } = await admin.from("trade_offers").insert({
    from_user_id: user.id, to_user_id, message: message || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = [
    ...(offer_have_ids ?? []).map((id: string) => ({ offer_id: offer.id, have_id: id, side: "offer" })),
    ...(request_have_ids ?? []).map((id: string) => ({ offer_id: offer.id, have_id: id, side: "request" })),
  ];
  if (items.length > 0) await admin.from("trade_offer_items").insert(items);

  return NextResponse.json({ offer }, { status: 201 });
}
