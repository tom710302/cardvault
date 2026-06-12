import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const authClient = createClient();
  const admin = createAdminClient();

  const { data: { user } } = await authClient.auth.getUser();

  const { data, error } = await admin
    .from("auctions")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "找不到此競標" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("id, username, display_name, avatar_url").eq("id", data.created_by).single();
  (data as any).profiles = profile ?? null;

  const isOwner = user?.id === data.created_by;
  const isWinner = user?.id === data.winner_id && data.status === "ended";
  if (!isOwner && !isWinner) (data as any).contact_info = null;

  return NextResponse.json({ auction: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { status } = body;

  const { data: auction } = await supabase.from("auctions").select("created_by").eq("id", params.id).single();
  if (!auction) return NextResponse.json({ error: "找不到競標" }, { status: 404 });
  if (auction.created_by !== user.id) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const updates: any = { status, updated_at: new Date().toISOString() };

  // 結標時找最高出價者
  if (status === "ended") {
    const { data: topBid } = await supabase.from("bids").select("user_id, amount")
      .eq("auction_id", params.id).order("amount", { ascending: false }).limit(1).single();
    if (topBid) updates.winner_id = topBid.user_id;
  }

  const { error } = await supabase.from("auctions").update(updates).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data: auction } = await supabase.from("auctions").select("created_by, status").eq("id", params.id).single();
  if (!auction) return NextResponse.json({ error: "找不到競標" }, { status: 404 });
  if (auction.created_by !== user.id) return NextResponse.json({ error: "無權限" }, { status: 403 });
  if (auction.status === "active") return NextResponse.json({ error: "進行中的競標無法刪除，請先結標" }, { status: 400 });

  const { error } = await supabase.from("auctions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
