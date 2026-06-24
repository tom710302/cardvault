import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getUserEmail, matchFoundEmail, checkEmailPref } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const admin = createAdminClient();
  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data } = await admin.from("trade_haves").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false });
  return NextResponse.json({ haves: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json();
  const { card_name, card_game, condition, image_url, note } = body;
  if (!card_name || !card_game) return NextResponse.json({ error: "請填寫卡牌名稱與遊戲" }, { status: 400 });
  const admin = createAdminClient();

  // 免費用戶限制 10 筆
  const { data: profileData } = await admin.from("profiles").select("is_premium").eq("id", user.id).single();
  if (!profileData?.is_premium) {
    const { count } = await admin.from("trade_haves").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true);
    if ((count ?? 0) >= 10) return NextResponse.json({ error: "免費方案最多 10 筆，升級 Premium 解鎖無限清單", premium_required: true }, { status: 403 });
  }

  const { data, error } = await admin.from("trade_haves").insert({
    user_id: user.id, card_name, card_game, condition: condition || "NM",
    image_url: image_url || null, note: note || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 配對通知 + 追蹤者通知
  const [{ data: matchedWants }, { data: myProfile }, { data: followers }] = await Promise.all([
    admin.from("trade_wants").select("user_id").ilike("card_name", card_name).eq("is_active", true).neq("user_id", user.id),
    admin.from("profiles").select("username, display_name").eq("id", user.id).single(),
    admin.from("user_follows").select("follower_id").eq("following_id", user.id),
  ]);
  const myName = myProfile?.display_name || myProfile?.username || "某位收藏家";
  const matchedUserIds = Array.from(new Set((matchedWants ?? []).map((w: any) => w.user_id)));
  const followerIds = (followers ?? []).map((f: any) => f.follower_id).filter((id: string) => !matchedUserIds.includes(id) && id !== user.id);

  await Promise.all([
    ...matchedUserIds.map(async (uid) => {
      await notifyUser({
        userId: uid,
        type: "trade_match",
        title: `有人上架了你想要的「${card_name}」`,
        body: `${myName} 新增了可換的 ${card_name}，快去看看！`,
        link: "/trade/matches",
      });
      const [email, canEmail] = await Promise.all([
        getUserEmail(admin, uid),
        checkEmailPref(admin, uid, "trade_match"),
      ]);
      if (email && canEmail) await sendEmail({ to: email, subject: `配對成功：${card_name}`, html: matchFoundEmail(myName, card_name) });
    }),
    ...followerIds.map((uid: string) =>
      notifyUser({
        userId: uid,
        type: "follow_new_card",
        title: `${myName} 新增了可換的「${card_name}」`,
        link: `/users/${user.id}`,
      })
    ),
  ]);

  return NextResponse.json({ have: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("trade_haves").update({ is_active: false }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
