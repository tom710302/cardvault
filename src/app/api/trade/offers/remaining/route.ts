import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DAILY_LIMITS: Record<string, number> = { "新手": 3, "老手": 10, "收藏家": Infinity, "卡牌大師": Infinity };

function calcTier(completed: number, avgRating: number | null): string {
  if (completed >= 30 && (avgRating ?? 0) >= 4.5) return "卡牌大師";
  if (completed >= 10) return "收藏家";
  if (completed >= 3) return "老手";
  return "新手";
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const { data: statsRow } = await admin.from("trade_user_stats").select("completed_trades, avg_rating").eq("user_id", user.id).single();
  const tier = calcTier(statsRow?.completed_trades ?? 0, statsRow?.avg_rating ?? null);
  const limit = DAILY_LIMITS[tier] ?? 3;

  if (!isFinite(limit)) return NextResponse.json({ tier, limit: null, used_today: 0, remaining: null });

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const { count } = await admin.from("trade_offers")
    .select("id", { count: "exact", head: true })
    .eq("from_user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  const used_today = count ?? 0;
  const remaining = Math.max(0, limit - used_today);
  return NextResponse.json({ tier, limit, used_today, remaining });
}
