import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyUser } from "@/lib/notify";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const admin = createAdminClient();

  const { data: offer } = await admin.from("trade_offers").select("*").eq("id", params.id).single();
  if (!offer) return NextResponse.json({ error: "找不到此提案" }, { status: 404 });
  if (offer.from_user_id !== user.id && offer.to_user_id !== user.id)
    return NextResponse.json({ error: "無權限" }, { status: 403 });

  // Fetch profiles separately
  const uids = Array.from(new Set([offer.from_user_id, offer.to_user_id]));
  const { data: profiles } = await admin.from("profiles").select("id, username, display_name, avatar_url").in("id", uids);
  const pm: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { pm[p.id] = p; });

  const { data: items } = await admin.from("trade_offer_items").select("*, have:have_id(*)").eq("offer_id", params.id);

  // Check if current user already reviewed
  const { data: myReview } = await admin.from("trade_reviews").select("id").eq("offer_id", params.id).eq("reviewer_id", user.id).single();

  return NextResponse.json({
    offer: {
      ...offer,
      from_profile: pm[offer.from_user_id] ?? null,
      to_profile: pm[offer.to_user_id] ?? null,
      items: items ?? [],
      has_my_review: !!myReview,
    }
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data: offer } = await admin
    .from("trade_offers")
    .select("from_user_id, to_user_id, status, from_confirmed, to_confirmed")
    .eq("id", params.id)
    .single();
  if (!offer) return NextResponse.json({ error: "找不到此提案" }, { status: 404 });
  if (offer.from_user_id !== user.id && offer.to_user_id !== user.id)
    return NextResponse.json({ error: "無權限" }, { status: 403 });

  // Fetch actor's display name for notification messages
  const { data: actorProfile } = await admin
    .from("profiles").select("username, display_name").eq("id", user.id).single();
  const actorName = actorProfile?.display_name || actorProfile?.username || "對方";

  // Dual-confirmation flow: both parties must confirm receipt before completing
  if (body.action === "confirm") {
    if (offer.status !== "accepted")
      return NextResponse.json({ error: "只能確認已接受的提案" }, { status: 400 });

    const isFrom = offer.from_user_id === user.id;
    const field = isFrom ? "from_confirmed" : "to_confirmed";
    await admin.from("trade_offers")
      .update({ [field]: true, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    const newFrom = isFrom ? true : offer.from_confirmed;
    const newTo = isFrom ? offer.to_confirmed : true;
    const otherPartyId = isFrom ? offer.to_user_id : offer.from_user_id;

    if (newFrom && newTo) {
      await admin.from("trade_offers")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", params.id);
      await Promise.all([
        admin.rpc("increment_reputation", { user_id: offer.from_user_id, amount: 10 }).maybeSingle(),
        admin.rpc("increment_reputation", { user_id: offer.to_user_id, amount: 10 }).maybeSingle(),
        notifyUser({
          userId: otherPartyId,
          type: "trade_completed",
          title: "換卡交易已完成！",
          body: "雙方都確認收到卡牌，別忘了留下評價",
          link: `/trade/offers/${params.id}`,
        }),
      ]);
      return NextResponse.json({ success: true, completed: true });
    }

    await notifyUser({
      userId: otherPartyId,
      type: "offer_confirmed",
      title: `${actorName} 已確認收到卡牌`,
      body: "等待你確認後，換卡就完成了",
      link: `/trade/offers/${params.id}`,
    });
    return NextResponse.json({ success: true, completed: false });
  }

  // Direct status update for accept / reject / cancel only
  const { status } = body;
  if (!status || status === "completed")
    return NextResponse.json({ error: "請使用確認流程完成交易" }, { status: 400 });

  const { error } = await admin.from("trade_offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "accepted") {
    await notifyUser({
      userId: offer.from_user_id,
      type: "offer_accepted",
      title: `${actorName} 接受了你的換卡提案`,
      link: `/trade/offers/${params.id}`,
    });
  } else if (status === "rejected") {
    await notifyUser({
      userId: offer.from_user_id,
      type: "offer_rejected",
      title: `${actorName} 拒絕了你的換卡提案`,
      link: `/trade/offers/${params.id}`,
    });
  } else if (status === "cancelled") {
    await notifyUser({
      userId: offer.to_user_id,
      type: "offer_cancelled",
      title: `${actorName} 取消了換卡提案`,
      link: `/trade/offers/${params.id}`,
    });
  }

  return NextResponse.json({ success: true });
}
