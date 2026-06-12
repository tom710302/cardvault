import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
  const { status } = await request.json();
  const admin = createAdminClient();
  const { data: offer } = await admin.from("trade_offers").select("from_user_id,to_user_id").eq("id", params.id).single();
  if (!offer) return NextResponse.json({ error: "找不到此提案" }, { status: 404 });
  if (offer.from_user_id !== user.id && offer.to_user_id !== user.id)
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  const { error } = await admin.from("trade_offers").update({ status, updated_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "completed") {
    await Promise.all([
      admin.rpc("increment_reputation", { user_id: offer.from_user_id, amount: 10 }).maybeSingle(),
      admin.rpc("increment_reputation", { user_id: offer.to_user_id, amount: 10 }).maybeSingle(),
    ]);
  }
  return NextResponse.json({ success: true });
}
