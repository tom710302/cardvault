import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getUserEmail, matchFoundEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const admin = createAdminClient();
  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data } = await admin.from("trade_wants").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false });
  return NextResponse.json({ wants: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json();
  const { card_name, card_game, condition_min, note } = body;
  if (!card_name || !card_game) return NextResponse.json({ error: "請填寫卡牌名稱與遊戲" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("trade_wants").insert({
    user_id: user.id, card_name, card_game, condition_min: condition_min || "LP", note: note || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 配對通知：找出其他人持有這張卡的 have，各通知一次
  const [{ data: matchedHaves }, { data: myProfile }] = await Promise.all([
    admin.from("trade_haves").select("user_id").ilike("card_name", card_name).eq("is_active", true).neq("user_id", user.id),
    admin.from("profiles").select("username, display_name").eq("id", user.id).single(),
  ]);
  const myName = myProfile?.display_name || myProfile?.username || "某位收藏家";
  const matchedUserIds = Array.from(new Set((matchedHaves ?? []).map((h: any) => h.user_id)));

  await Promise.all([
    // Email 通知
    ...matchedUserIds.map(async (uid) => {
      const email = await getUserEmail(admin, uid);
      if (email) await sendEmail({ to: email, subject: `配對成功：${card_name}`, html: matchFoundEmail(myName, card_name) });
    }),
    // In-app 通知
    matchedUserIds.length > 0
      ? admin.from("notifications").insert(
          matchedUserIds.map(uid => ({
            user_id: uid,
            type: "trade_match",
            title: `有人在找你有的「${card_name}」`,
            message: `${myName} 想要 ${card_name}，你們可以互換！`,
            link: "/trade/matches",
          }))
        )
      : Promise.resolve(),
  ]);

  return NextResponse.json({ want: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("trade_wants").update({ is_active: false }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
