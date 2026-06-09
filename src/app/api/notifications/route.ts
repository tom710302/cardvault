import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [] });

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await request.json();
  if (id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
  } else {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
  }
  return NextResponse.json({ success: true });
}
