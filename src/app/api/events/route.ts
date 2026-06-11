import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const city = searchParams.get("city");
  const status = searchParams.get("status") ?? "approved";
  const upcoming = searchParams.get("upcoming") !== "false";

  let query = supabase
    .from("events")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("status", status)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (game && game !== "全部") query = query.eq("game", game);
  if (city && city !== "全部") query = query.eq("city", city);
  if (upcoming) query = query.gte("start_date", new Date().toISOString().split("T")[0]);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await request.json();
  const { title, game, event_type, start_date, end_date, start_time, end_time,
    venue_name, address, city, entry_fee, max_participants, format,
    registration_url, description } = body;

  if (!title || !game || !start_date || !venue_name || !city) {
    return NextResponse.json({ error: "請填寫必填欄位" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = ["admin", "moderator"].includes(profile?.role ?? "");

  const { data, error } = await supabase.from("events").insert({
    title, game, event_type: event_type ?? "community",
    start_date, end_date: end_date || null,
    start_time: start_time || null, end_time: end_time || null,
    venue_name, address: address || null, city,
    entry_fee: entry_fee ? parseInt(entry_fee) : null,
    max_participants: max_participants ? parseInt(max_participants) : null,
    format: format || null,
    registration_url: registration_url || null,
    description: description || null,
    source: "community",
    submitted_by: user.id,
    status: isAdmin ? "approved" : "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
