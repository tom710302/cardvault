import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { target_id, target_type, value } = await request.json();
  if (!target_id || !target_type || ![1, -1].includes(value)) {
    return NextResponse.json({ error: "無效參數" }, { status: 400 });
  }

  const table = target_type === "post" ? "posts" : "comments";
  const authorField = target_type === "post" ? "author_id" : "author_id";
  const repDelta = target_type === "post" ? 2 : 1;

  // Get current target (upvotes + author)
  const { data: targetData } = await supabase
    .from(table)
    .select(`upvotes, ${authorField}`)
    .eq("id", target_id)
    .single();
  const authorId: string | null = (targetData as any)?.[authorField] ?? null;
  const canRep = authorId && authorId !== user.id;

  // Check existing vote
  const { data: existing } = await supabase
    .from("votes")
    .select("id, value")
    .eq("user_id", user.id)
    .eq("target_id", target_id)
    .single();

  if (existing) {
    if (existing.value === value) {
      // Toggle off — cancel vote
      await supabase.from("votes").delete().eq("id", existing.id);
      await supabase.from(table)
        .update({ upvotes: Math.max(0, (targetData?.upvotes ?? 0) - value) })
        .eq("id", target_id);
      // Reverse rep for removed upvote
      if (value === 1 && canRep) {
        await supabase.rpc("increment_reputation", { user_id: authorId, amount: -repDelta }).maybeSingle();
      }
      return NextResponse.json({ action: "removed" });
    } else {
      // Switch direction
      await supabase.from("votes").update({ value }).eq("id", existing.id);
      if (canRep) {
        // +repDelta if switching to upvote, -repDelta if switching to downvote
        await supabase.rpc("increment_reputation", { user_id: authorId, amount: value === 1 ? repDelta : -repDelta }).maybeSingle();
      }
    }
  } else {
    // New vote
    await supabase.from("votes").insert({ user_id: user.id, target_id, target_type, value });
    if (value === 1 && canRep) {
      await supabase.rpc("increment_reputation", { user_id: authorId, amount: repDelta }).maybeSingle();
    }
  }

  // Update upvotes count
  const newUpvotes = (targetData?.upvotes ?? 0) + (existing ? value * 2 : value);
  await supabase.from(table).update({ upvotes: Math.max(0, newUpvotes) }).eq("id", target_id);

  return NextResponse.json({ action: "voted", value });
}
