import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trade_haves")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const noCache = { headers: { "Cache-Control": "no-store" } };

  if (!data?.length) return NextResponse.json({ haves: [] }, noCache);

  // Fetch profiles separately
  const userIds = Array.from(new Set(data.map((h: any) => h.user_id)));
  const { data: profiles } = await admin.from("profiles").select("id, username, display_name").in("id", userIds);
  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  return NextResponse.json(
    { haves: data.map((h: any) => ({ ...h, profiles: profileMap[h.user_id] ?? null })) },
    noCache
  );
}
