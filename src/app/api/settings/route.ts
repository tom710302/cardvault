import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const supabase = createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).single();
  return NextResponse.json({ value: data?.value ?? null });
}
