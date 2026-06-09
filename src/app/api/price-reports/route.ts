import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("card_id");
  if (!cardId) return NextResponse.json({ error: "缺少 card_id" }, { status: 400 });

  const { data, error } = await supabase
    .from("price_reports")
    .select(`*, profiles(username)`)
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { card_id, price, condition, source_url } = await request.json();
  if (!card_id || !price) return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });

  const { data, error } = await supabase
    .from("price_reports")
    .insert({ card_id, price, condition: condition ?? "NM", source_url, reporter_id: user.id })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data }, { status: 201 });
}
