import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "active";
  const search = searchParams.get("search") ?? "";

  let query = supabase
    .from("auctions")
    .select("*, profiles(username, display_name, avatar_url)")
    .order("end_at", { ascending: true });

  if (status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ auctions: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { title, description, image_url, starting_price, min_increment, end_at, contact_info } = body;
  if (!title || !starting_price || !end_at) return NextResponse.json({ error: "請填寫必填欄位" }, { status: 400 });

  const { data, error } = await supabase.from("auctions").insert({
    title, description: description || null,
    image_url: image_url || null,
    starting_price: parseInt(starting_price),
    current_price: parseInt(starting_price),
    min_increment: parseInt(min_increment ?? 1),
    end_at,
    contact_info: contact_info || null,
    created_by: user.id,
    status: "active",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ auction: data }, { status: 201 });
}
