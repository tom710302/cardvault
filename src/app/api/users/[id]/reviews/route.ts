import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: reviews } = await admin
    .from("trade_reviews")
    .select("id, rating, comment, created_at, reviewer_id")
    .eq("reviewee_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!reviews?.length) return NextResponse.json({ reviews: [], stats: { positive: 0, neutral: 0, negative: 0, total: 0 } });

  const reviewerIds = Array.from(new Set(reviews.map(r => r.reviewer_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", reviewerIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  const enriched = reviews.map(r => ({
    ...r,
    reviewer: profileMap[r.reviewer_id] ?? null,
  }));

  const stats = {
    positive: reviews.filter(r => r.rating === "positive").length,
    neutral: reviews.filter(r => r.rating === "neutral").length,
    negative: reviews.filter(r => r.rating === "negative").length,
    total: reviews.length,
  };

  return NextResponse.json({ reviews: enriched, stats });
}
