import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function calcTier(completed: number, avgRating: number | null): "新手" | "老手" | "收藏家" | "卡牌大師" {
  if (completed >= 30 && (avgRating ?? 0) >= 4.5) return "卡牌大師";
  if (completed >= 10) return "收藏家";
  if (completed >= 3) return "老手";
  return "新手";
}

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trade_user_stats")
    .select("*")
    .eq("user_id", params.userId)
    .single();

  const completed = data?.completed_trades ?? 0;
  const incomplete = data?.incomplete_trades ?? 0;
  const avg_rating = data?.avg_rating ?? null;
  const total = completed + incomplete;
  const incomplete_rate = total > 0 ? Math.round((incomplete / total) * 100) : 0;
  const tier = calcTier(completed, avg_rating);

  return NextResponse.json({
    stats: { ...data, completed_trades: completed, incomplete_trades: incomplete, avg_rating, review_count: data?.review_count ?? 0, incomplete_rate, tier }
  });
}
