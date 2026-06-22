import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getUserEmail, tradeOfferEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

const DAILY_LIMITS: Record<string, number> = { "新手": 3, "老手": 10, "收藏家": Infinity, "卡牌大師": Infinity };

function calcTier(completed: number, avgRating: number | null): string {
  if (completed >= 30 && (avgRating ?? 0) >= 4.5) return "卡牌大師";
  if (completed >= 10) return "收藏家";
  if (completed >= 3) return "老手";
  return "新手";
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();

  const { data: offers } = await admin
    .from("trade_offers")
    .select("*")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (!offers?.length) return NextResponse.json({ offers: [] });

  // Fetch profiles and offer items in parallel
  const offerIds = offers.map((o: any) => o.id);
  const uids = Array.from(new Set(offers.flatMap((o: any) => [o.from_user_id, o.to_user_id])));
  const [{ data: profiles }, { data: items }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_url").in("id", uids),
    admin.from("trade_offer_items").select("offer_id, direction, trade_haves(card_name, card_game, condition)").in("offer_id", offerIds),
  ]);

  const pm: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { pm[p.id] = p; });

  const itemMap: Record<string, { offer: any[]; request: any[] }> = {};
  (items ?? []).forEach((item: any) => {
    if (!itemMap[item.offer_id]) itemMap[item.offer_id] = { offer: [], request: [] };
    const dir = item.direction === "offer" ? "offer" : "request";
    if (item.trade_haves) itemMap[item.offer_id][dir].push(item.trade_haves);
  });

  return NextResponse.json({
    offers: offers.map((o: any) => ({
      ...o,
      from_profile: pm[o.from_user_id] ?? null,
      to_profile: pm[o.to_user_id] ?? null,
      items: itemMap[o.id] ?? { offer: [], request: [] },
    }))
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { to_user_id, offer_have_ids, request_have_ids, message } = await request.json();
  if (!to_user_id || !offer_have_ids?.length) return NextResponse.json({ error: "請選擇要提供的卡牌" }, { status: 400 });

  const admin = createAdminClient();

  // Check daily limit based on tier
  const { data: statsRow } = await admin.from("trade_user_stats").select("completed_trades, avg_rating").eq("user_id", user.id).single();
  const tier = calcTier(statsRow?.completed_trades ?? 0, statsRow?.avg_rating ?? null);
  const limit = DAILY_LIMITS[tier] ?? 3;

  if (isFinite(limit)) {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { count } = await admin.from("trade_offers")
      .select("id", { count: "exact", head: true })
      .eq("from_user_id", user.id)
      .gte("created_at", todayStart.toISOString());
    if ((count ?? 0) >= limit) {
      return NextResponse.json({ error: `${tier}每日最多發送 ${limit} 則提案，明天再試！升級等級可解除限制。` }, { status: 429 });
    }
  }

  const { data: offer, error } = await admin.from("trade_offers").insert({
    from_user_id: user.id, to_user_id, message: message || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = [
    ...(offer_have_ids ?? []).map((id: string) => ({ offer_id: offer.id, have_id: id, direction: "offer" })),
    ...(request_have_ids ?? []).map((id: string) => ({ offer_id: offer.id, have_id: id, direction: "request" })),
  ];
  if (items.length > 0) await admin.from("trade_offer_items").insert(items);

  const [{ data: fromProfile }, toEmail] = await Promise.all([
    admin.from("profiles").select("username, display_name").eq("id", user.id).single(),
    getUserEmail(admin, to_user_id),
  ]);
  const fromName = fromProfile?.display_name || fromProfile?.username || "有人";

  await Promise.all([
    toEmail
      ? sendEmail({ to: toEmail, subject: `${fromName} 向你提出了換卡邀請`, html: tradeOfferEmail(fromName) })
      : Promise.resolve(),
    notifyUser({
      userId: to_user_id,
      type: "trade_offer",
      title: `${fromName} 向你發出換卡提案`,
      body: message || null,
      link: `/trade/offers/${offer.id}`,
    }),
  ]);

  return NextResponse.json({ offer }, { status: 201 });
}
