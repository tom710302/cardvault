import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "active";
  const search = searchParams.get("search") ?? "";

  let query = admin
    .from("auctions")
    .select("*")
    .order("end_at", { ascending: true });

  if (status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((data ?? []).map((a: any) => a.created_by).filter(Boolean)));
  const profileMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
    (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });
  }

  return NextResponse.json({ auctions: (data ?? []).map((a: any) => ({ ...a, profiles: profileMap[a.created_by] ?? null })) });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { title, description, image_url, starting_price, min_increment, end_at, contact_info } = body;
  if (!title || !starting_price || !end_at) return NextResponse.json({ error: "請填寫必填欄位" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("auctions").insert({
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
