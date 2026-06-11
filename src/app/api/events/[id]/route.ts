import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("id", params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "找不到賽事" }, { status: 404 });
  return NextResponse.json({ event: data });
}
