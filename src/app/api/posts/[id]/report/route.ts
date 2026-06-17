import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { reason } = await request.json();
  if (!reason) return NextResponse.json({ error: "請選擇檢舉原因" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("post_reports")
    .insert({ reporter_id: user.id, post_id: params.id, reason });

  if (error?.code === "23505") return NextResponse.json({ error: "已檢舉過此貼文" }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
