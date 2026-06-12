import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trade_user_stats")
    .select("*")
    .eq("user_id", params.userId)
    .single();

  if (!data) return NextResponse.json({ stats: { completed_trades: 0, incomplete_trades: 0, avg_rating: null, review_count: 0 } });

  const completed = data.completed_trades ?? 0;
  const incomplete = data.incomplete_trades ?? 0;
  const total = completed + incomplete;
  const incomplete_rate = total > 0 ? Math.round((incomplete / total) * 100) : 0;

  return NextResponse.json({ stats: { ...data, incomplete_rate } });
}
