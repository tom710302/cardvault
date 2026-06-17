import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name, reputation, avatar_url")
    .order("reputation", { ascending: false })
    .limit(50);

  if (!profiles?.length) return NextResponse.json({ users: [] });

  const ids = profiles.map((p: any) => p.id);

  const { data: statsRows } = await admin
    .from("trade_user_stats")
    .select("user_id, completed_trades, avg_rating")
    .in("user_id", ids);

  const statsMap: Record<string, { completed_trades: number; avg_rating: number | null }> = {};
  (statsRows ?? []).forEach((r: any) => { statsMap[r.user_id] = r; });

  function calcTier(completed: number, avgRating: number | null): string {
    if (completed >= 30 && (avgRating ?? 0) >= 4.5) return "卡牌大師";
    if (completed >= 10) return "收藏家";
    if (completed >= 3) return "老手";
    return "新手";
  }

  const users = profiles.map((p: any) => {
    const stats = statsMap[p.id];
    return {
      ...p,
      trade_tier: calcTier(stats?.completed_trades ?? 0, stats?.avg_rating ?? null),
      completed_trades: stats?.completed_trades ?? 0,
    };
  });

  return NextResponse.json({ users });
}
