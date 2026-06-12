import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const [storeRes, eventsRes, productsRes] = await Promise.all([
    supabase.from("stores").select("*").eq("id", params.id).single(),
    supabase.from("store_events").select("*").eq("store_id", params.id).eq("is_active", true).order("event_date", { ascending: true }),
    supabase.from("store_products").select("*").eq("store_id", params.id).eq("is_active", true).order("created_at", { ascending: false }),
  ]);

  if (storeRes.error) return NextResponse.json({ error: "找不到此店舖" }, { status: 404 });

  // Increment view count (fire-and-forget)
  const admin = createAdminClient();
  admin.from("stores")
    .update({ view_count: (storeRes.data.view_count ?? 0) + 1 })
    .eq("id", params.id)
    .then(() => {});

  return NextResponse.json({ store: storeRes.data, events: eventsRes.data ?? [], products: productsRes.data ?? [] });
}
