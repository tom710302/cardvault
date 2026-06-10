import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getStoreOwner() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, store_id").eq("id", user.id).single();
  if (!profile?.store_id || !["store_owner", "admin"].includes(profile.role ?? "")) return null;
  return { user, profile };
}

export async function GET() {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { data } = await supabase.from("store_events")
    .select("*").eq("store_id", owner.profile.store_id!).order("created_at", { ascending: false });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { title, description, event_date, image_url } = await request.json();
  if (!title) return NextResponse.json({ error: "活動名稱為必填" }, { status: 400 });

  const { data, error } = await supabase.from("store_events")
    .insert({ store_id: owner.profile.store_id!, title, description, event_date: event_date || null, image_url: image_url || null })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { id } = await request.json();
  await supabase.from("store_events").update({ is_active: false }).eq("id", id).eq("store_id", owner.profile.store_id!);
  return NextResponse.json({ success: true });
}
