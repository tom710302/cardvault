import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "無權限" }, { status: 403 });
  const supabase = createClient();
  const { data } = await supabase.from("site_settings").select("*").order("key");
  return NextResponse.json({ settings: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "無權限" }, { status: 403 });
  const supabase = createClient();
  const { key, value } = await request.json();
  if (!key) return NextResponse.json({ error: "key 為必填" }, { status: 400 });
  const { error } = await supabase.from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
