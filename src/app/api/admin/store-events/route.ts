import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function POST(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { store_id, title, description, event_date, image_url } = await request.json();
  if (!store_id || !title) return NextResponse.json({ error: "必填欄位缺失" }, { status: 400 });

  const { data, error } = await supabase.from("store_events")
    .insert({ store_id, title, description, event_date: event_date || null, image_url: image_url || null })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { id } = await request.json();
  await supabase.from("store_events").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ success: true });
}
