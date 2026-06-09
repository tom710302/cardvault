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

  // Upsert vote
  const { data: existing } = await supabase
    .from("votes")
    .select("id, value")
    .eq("user_id", user.id)
    .eq("target_id", target_id)
    .single();

  if (existing) {
    if (existing.value === value) {
      // 取消投票
      await supabase.from("votes").delete().eq("id", existing.id);
      const table = target_type === "post" ? "posts" : "comments";
      await supabase.from(table).update({ upvotes: supabase.rpc as any }).eq("id", target_id);
      // 直接更新 upvotes
      const { data: target } = await supabase.from(table).select("upvotes").eq("id", target_id).single();
      await supabase.from(table).update({ upvotes: Math.max(0, (target?.upvotes ?? 0) - value) }).eq("id", target_id);
      return NextResponse.json({ action: "removed" });
    } else {
      await supabase.from("votes").update({ value }).eq("id", existing.id);
    }
  } else {
    await supabase.from("votes").insert({ user_id: user.id, target_id, target_type, value });
  }

  // 更新 upvotes
  const table = target_type === "post" ? "posts" : "comments";
  const { data: target } = await supabase.from(table).select("upvotes").eq("id", target_id).single();
  const newUpvotes = (target?.upvotes ?? 0) + (existing ? value * 2 : value);
  await supabase.from(table).update({ upvotes: Math.max(0, newUpvotes) }).eq("id", target_id);

  return NextResponse.json({ action: "voted", value });
}
