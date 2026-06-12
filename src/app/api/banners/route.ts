import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return NextResponse.json({ banners: data ?? [] });
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin.from("banners").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ banner: data });
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("banners")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ banner: data });
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("banners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
