import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { reported_user_id, offer_id, reason } = await req.json();
  if (!reported_user_id || !reason?.trim()) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (reported_user_id === user.id) {
    return NextResponse.json({ error: "不能回報自己" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trade_fraud_reports")
    .insert({
      reporter_id: user.id,
      reported_user_id,
      offer_id: offer_id ?? null,
      reason: reason.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data }, { status: 201 });
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { data: reports } = await admin
    .from("trade_fraud_reports")
    .select("*, reporter:reporter_id(username, display_name), reported:reported_user_id(username, display_name)")
    .order("created_at", { ascending: false });

  return NextResponse.json({ reports: reports ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { id, action } = await req.json();
  const status = action === "resolve" ? "reviewed" : "dismissed";
  await admin.from("trade_fraud_reports").update({ status }).eq("id", id);
  return NextResponse.json({ ok: true });
}
