import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  // 1. Fetch all profiles with public collection counts
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name, reputation, avatar_url")
    .order("reputation", { ascending: false })
    .limit(50);

  if (!profiles?.length) return NextResponse.json({ users: [] });

  const ids = profiles.map((p: any) => p.id);

  // 2. Collection counts per user (public only)
  const { data: colRows } = await admin
    .from("collections")
    .select("user_id")
    .in("user_id", ids)
    .eq("visibility", "public");

  const colCount: Record<string, number> = {};
  (colRows ?? []).forEach((r: any) => { colCount[r.user_id] = (colCount[r.user_id] ?? 0) + 1; });

  // 3. Trade stats for tier
  const { data: statsRows } = await admin
    .from("trade_user_stats")
    .select("user_id, completed_trades, avg_rating")
    .in("user_id", ids);

  const statsMap: Record<string, { completed_trades: number; avg_rating: number | null }> = {};
  (statsRows ?? []).forEach((r: any) => { statsMap[r.user_id] = r; });

  // 4. Preview images (first 4 public collections per user)
  const { data: colImages } = await admin
    .from("collections")
    .select("user_id, image_url, cards(image_url)")
    .in("user_id", ids)
    .eq("visibility", "public")
    .limit(4 * ids.length);

  const previewMap: Record<string, string[]> = {};
  (colImages ?? []).forEach((c: any) => {
    const img = c.image_url ?? c.cards?.image_url ?? null;
    if (!img) return;
    if (!previewMap[c.user_id]) previewMap[c.user_id] = [];
    if (previewMap[c.user_id].length < 4) previewMap[c.user_id].push(img);
  });

  function calcTier(completed: number, avgRating: number | null): string {
    if (completed >= 30 && (avgRating ?? 0) >= 4.5) return "卡牌大師";
    if (completed >= 10) return "收藏家";
    if (completed >= 3) return "老手";
    return "新手";
  }

  const users = profiles
    .map((p: any) => {
      const count = colCount[p.id] ?? 0;
      const stats = statsMap[p.id];
      const tier = calcTier(stats?.completed_trades ?? 0, stats?.avg_rating ?? null);
      const is_featured = count >= 5 || tier === "收藏家" || tier === "卡牌大師";
      return {
        ...p,
        collection_count: count,
        trade_tier: tier,
        is_featured,
        preview_images: previewMap[p.id] ?? [],
      };
    })
    .filter((u: any) => u.collection_count > 0);

  return NextResponse.json({ users });
}
