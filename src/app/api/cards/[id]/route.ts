import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("cards").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "找不到卡牌" }, { status: 404 });
  return NextResponse.json({ card: data });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  // 允許上傳者或管理員編輯
  const { data: card } = await supabase.from("cards").select("created_by").eq("id", params.id).single();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = card?.created_by === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "只有上傳者或管理員才能編輯" }, { status: 403 });

  const body = await request.json();
  const { name, name_en, game, card_type, set_name, set_code, rarity, description, image_url } = body;
  const { data, error } = await supabase.from("cards")
    .update({ name, name_en, game, card_type, set_name, set_code, rarity, description, image_url: image_url || null })
    .eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "無權限" }, { status: 403 });

  await supabase.from("cards").update({ is_active: false }).eq("id", params.id);
  return NextResponse.json({ success: true });
}
