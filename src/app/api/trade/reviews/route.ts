import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyUser } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { offer_id, rating, comment } = await request.json();
  if (!offer_id || !["positive", "neutral", "negative"].includes(rating))
    return NextResponse.json({ error: "評分資料不完整" }, { status: 400 });

  const admin = createAdminClient();

  const { data: offer } = await admin
    .from("trade_offers")
    .select("from_user_id, to_user_id, status")
    .eq("id", offer_id)
    .single();

  if (!offer) return NextResponse.json({ error: "找不到提案" }, { status: 404 });
  if (offer.status !== "completed") return NextResponse.json({ error: "只能評價已完成的換卡" }, { status: 400 });
  if (offer.from_user_id !== user.id && offer.to_user_id !== user.id)
    return NextResponse.json({ error: "無權限" }, { status: 403 });

  const reviewee_id = offer.from_user_id === user.id ? offer.to_user_id : offer.from_user_id;

  const { error } = await admin.from("trade_reviews").insert({
    offer_id,
    reviewer_id: user.id,
    reviewee_id,
    rating,
    comment: comment?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "已評價過此交易" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: reviewerProfile } = await admin
    .from("profiles").select("username, display_name").eq("id", user.id).single();
  const reviewerName = reviewerProfile?.display_name || reviewerProfile?.username || "用戶";
  const ratingLabel = ({ positive: "好評", neutral: "中評", negative: "差評" } as Record<string, string>)[rating] ?? "評價";

  await notifyUser({
    userId: reviewee_id,
    type: "review_received",
    title: `${reviewerName} 給了你一個${ratingLabel}`,
    body: comment?.trim() || null,
    link: `/users/${reviewee_id}`,
  });

  return NextResponse.json({ success: true });
}
