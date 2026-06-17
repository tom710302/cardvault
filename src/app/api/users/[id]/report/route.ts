import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (params.id === user.id) return NextResponse.json({ error: "不能檢舉自己" }, { status: 400 });

  const { reason } = await req.json();
  if (!reason?.trim()) return NextResponse.json({ error: "請填寫檢舉原因" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("user_reports").insert({
    reporter_id: user.id,
    reported_user_id: params.id,
    reason: reason.trim(),
  });

  if (error?.code === "23505") return NextResponse.json({ error: "你已經檢舉過此用戶" }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
