import { createAdminClient, createClient } from "@/lib/supabase/server";
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

  const admin = createAdminClient();
  const body = await request.json();
  const { name, name_en, game, card_type, set_name, set_code, rarity, description } = body;
  if (!name || !game) return NextResponse.json({ error: "名稱和遊戲為必填" }, { status: 400 });

  const { data, error } = await admin.from("cards").insert({ name, name_en, game, card_type: card_type ?? "tcg", set_name, set_code, rarity, description }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data }, { status: 201 });
}
