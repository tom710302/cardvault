import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();

  const { data: conversations } = await admin
    .from("conversations")
    .select("id, user1_id, user2_id, last_message_at")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  if (!conversations?.length) return NextResponse.json({ conversations: [], unread_total: 0 });

  const convIds = conversations.map(c => c.id);
  const otherIds = Array.from(new Set(conversations.map(c =>
    c.user1_id === user.id ? c.user2_id : c.user1_id
  )));

  const [{ data: profiles }, { data: recentMsgs }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds),
    admin.from("messages")
      .select("id, conversation_id, sender_id, content, is_read, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  const lastMsgMap: Record<string, any> = {};
  const unreadMap: Record<string, number> = {};
  for (const msg of recentMsgs ?? []) {
    if (!lastMsgMap[msg.conversation_id]) lastMsgMap[msg.conversation_id] = msg;
    if (!msg.is_read && msg.sender_id !== user.id) {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1;
    }
  }

  const result = conversations.map(c => {
    const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
    return {
      id: c.id,
      last_message_at: c.last_message_at,
      other: profileMap[otherId] ?? null,
      last_message: lastMsgMap[c.id] ?? null,
      unread_count: unreadMap[c.id] ?? 0,
    };
  });

  const unread_total = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  return NextResponse.json({ conversations: result, unread_total });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { target_user_id } = await request.json();
  if (!target_user_id) return NextResponse.json({ error: "缺少目標用戶" }, { status: 400 });
  if (target_user_id === user.id) return NextResponse.json({ error: "不能和自己私訊" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${target_user_id}),and(user1_id.eq.${target_user_id},user2_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) return NextResponse.json({ conversation: existing });

  const { data, error } = await admin
    .from("conversations")
    .insert({ user1_id: user.id, user2_id: target_user_id })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data }, { status: 201 });
}
