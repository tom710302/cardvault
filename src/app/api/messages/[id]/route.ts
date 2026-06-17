import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function verifyMember(convId: string, userId: string, admin: any) {
  const { data } = await admin
    .from("conversations")
    .select("id, user1_id, user2_id")
    .eq("id", convId)
    .maybeSingle();
  if (!data || (data.user1_id !== userId && data.user2_id !== userId)) return null;
  return data;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const conv = await verifyMember(params.id, user.id, admin);
  if (!conv) return NextResponse.json({ error: "找不到對話" }, { status: 404 });

  const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

  const [{ data: messages }, { data: other }] = await Promise.all([
    admin.from("messages")
      .select("id, sender_id, content, is_read, created_at")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true }),
    admin.from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", otherId)
      .single(),
  ]);

  // Mark unread messages as read
  const unreadIds = (messages ?? [])
    .filter(m => !m.is_read && m.sender_id !== user.id)
    .map(m => m.id);
  if (unreadIds.length > 0) {
    await admin.from("messages").update({ is_read: true }).in("id", unreadIds);
  }

  return NextResponse.json({ messages: messages ?? [], other });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const conv = await verifyMember(params.id, user.id, admin);
  if (!conv) return NextResponse.json({ error: "找不到對話" }, { status: 404 });

  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "訊息不能為空" }, { status: 400 });

  const { data: message, error } = await admin
    .from("messages")
    .insert({ conversation_id: params.id, sender_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ message }, { status: 201 });
}
