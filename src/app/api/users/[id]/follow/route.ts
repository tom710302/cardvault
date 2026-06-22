import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyUser } from "@/lib/notify";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const [{ count: followerCount }, followRow] = await Promise.all([
    admin.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", params.id),
    user ? admin.from("user_follows").select("id").eq("follower_id", user.id).eq("following_id", params.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({ following: !!followRow.data, follower_count: followerCount ?? 0 });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (user.id === params.id) return NextResponse.json({ error: "不能追蹤自己" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("user_follows").insert({ follower_id: user.id, following_id: params.id });
  if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin.from("profiles").select("display_name, username").eq("id", user.id).single();
  const followerName = profile?.display_name || profile?.username || "有人";

  await notifyUser({
    userId: params.id,
    type: "new_follower",
    title: `${followerName} 開始追蹤你`,
    link: `/users/${user.id}`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", params.id);

  return NextResponse.json({ success: true });
}
