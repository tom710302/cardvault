import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_preferences")
    .select("email_trade_offer, email_comment_reply, email_trade_match")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    prefs: {
      email_trade_offer: data?.email_trade_offer ?? true,
      email_comment_reply: data?.email_comment_reply ?? true,
      email_trade_match: data?.email_trade_match ?? true,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const body = await request.json();
  const update: Record<string, boolean> = {};
  for (const key of ["email_trade_offer", "email_comment_reply", "email_trade_match"]) {
    if (typeof body[key] === "boolean") update[key] = body[key];
  }

  const admin = createAdminClient();
  await admin.from("notification_preferences").upsert({
    user_id: user.id,
    ...update,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
