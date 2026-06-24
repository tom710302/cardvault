import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { id, is_verified, plan_type } = await request.json();
  const updates: Record<string, unknown> = {};
  if (is_verified !== undefined) updates.is_verified = is_verified;
  if (plan_type !== undefined) {
    updates.plan_type = plan_type;
    updates.is_verified = plan_type !== "free";
  }
  const { error } = await supabase.from("stores").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
