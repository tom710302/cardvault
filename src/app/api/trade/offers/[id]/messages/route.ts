import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getParticipant(admin: ReturnType<typeof createAdminClient>, offerId: string, userId: string) {
  const { data: offer } = await admin
    .from("trade_offers")
    .select("from_user_id, to_user_id")
    .eq("id", offerId)
    .single();
  if (!offer) return null;
  if (offer.from_user_id !== userId && offer.to_user_id !== userId) return null;
  return offer;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const offer = await getParticipant(admin, params.id, user.id);
  if (!offer) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { data: messages } = await admin
    .from("trade_messages")
    .select("id, content, created_at, sender_id, profiles(username, display_name)")
    .eq("offer_id", params.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const offer = await getParticipant(admin, params.id, user.id);
  if (!offer) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "訊息不得為空" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "訊息過長（最多 500 字）" }, { status: 400 });

  const { data: message, error } = await admin
    .from("trade_messages")
    .insert({ offer_id: params.id, sender_id: user.id, content: content.trim() })
    .select("id, content, created_at, sender_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message }, { status: 201 });
}
