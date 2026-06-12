import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trade_haves")
    .select("*, profiles(id, username, display_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ haves: data ?? [] });
}
