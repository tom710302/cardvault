import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bids")
    .select("*")
    .eq("auction_id", params.id)
    .order("amount", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((data ?? []).map((b: any) => b.user_id).filter(Boolean)));
  const profileMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username, display_name").in("id", userIds);
    (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });
  }

  return NextResponse.json({ bids: (data ?? []).map((b: any) => ({ ...b, profiles: profileMap[b.user_id] ?? null })) });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入才能出價" }, { status: 401 });

  const { amount } = await request.json();
  if (!amount || isNaN(amount)) return NextResponse.json({ error: "請輸入有效出價金額" }, { status: 400 });

  const admin = createAdminClient();
  const { data: auction } = await admin.from("auctions")
    .select("id, status, current_price, min_increment, end_at, created_by")
    .eq("id", params.id).single();

  if (!auction) return NextResponse.json({ error: "找不到此競標" }, { status: 404 });
  if (auction.status !== "active") return NextResponse.json({ error: "此競標已結束" }, { status: 400 });
  if (new Date(auction.end_at) < new Date()) return NextResponse.json({ error: "競標已到期" }, { status: 400 });
  if (auction.created_by === user.id) return NextResponse.json({ error: "不能對自己的競標出價" }, { status: 400 });

  const minBid = auction.current_price + auction.min_increment;
  if (parseInt(amount) < minBid) return NextResponse.json({ error: `出價需高於目前最高價至少 ${auction.min_increment} 元（最低 NT$${minBid}）` }, { status: 400 });

  const { error: bidError } = await admin.from("bids").insert({
    auction_id: params.id,
    user_id: user.id,
    amount: parseInt(amount),
  });
  if (bidError) return NextResponse.json({ error: bidError.message }, { status: 500 });

  const { error: updateError } = await admin.from("auctions")
    .update({ current_price: parseInt(amount), updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, new_price: parseInt(amount) });
}
