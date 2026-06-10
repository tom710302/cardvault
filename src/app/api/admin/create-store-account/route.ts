import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { email, password, store_id, username } = await request.json();
  if (!email || !password || !store_id || !username) {
    return NextResponse.json({ error: "所有欄位皆為必填" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 建立 Supabase Auth 帳號
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { user_name: username, full_name: username },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // 更新 profile 為 store_owner 並連結店舖
  const { error: profileError } = await admin.from("profiles")
    .update({ role: "store_owner", store_id, username, display_name: username })
    .eq("id", authData.user!.id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ success: true, user_id: authData.user!.id });
}
