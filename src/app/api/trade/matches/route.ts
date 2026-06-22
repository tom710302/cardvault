import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();

  // Get current user's haves and wants
  const [{ data: myHaves }, { data: myWants }] = await Promise.all([
    admin.from("trade_haves").select("*").eq("user_id", user.id).eq("is_active", true),
    admin.from("trade_wants").select("*").eq("user_id", user.id).eq("is_active", true),
  ]);

  if (!myHaves?.length && !myWants?.length) return NextResponse.json({ matches: [] });

  const myHaveNames = (myHaves ?? []).map((h: any) => h.card_name.toLowerCase());
  const myWantNames = (myWants ?? []).map((w: any) => w.card_name.toLowerCase());

  // Fetch users with active offers to exclude them
  const { data: activeOffers } = await admin
    .from("trade_offers")
    .select("from_user_id, to_user_id")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .in("status", ["pending", "accepted"]);

  const excludedIds = new Set<string>(
    (activeOffers ?? []).map((o: any) =>
      o.from_user_id === user.id ? o.to_user_id : o.from_user_id
    )
  );

  const [{ data: theyHaveWhatIWant }, { data: theyWantWhatIHave }] = await Promise.all([
    admin.from("trade_haves")
      .select("*, profiles(id, username, display_name, avatar_url)")
      .neq("user_id", user.id)
      .eq("is_active", true),
    admin.from("trade_wants")
      .select("*, profiles(id, username, display_name, avatar_url)")
      .neq("user_id", user.id)
      .eq("is_active", true),
  ]);

  const userMap: Record<string, any> = {};

  (theyHaveWhatIWant ?? []).forEach((item: any) => {
    if (excludedIds.has(item.user_id)) return;
    if (!myWantNames.includes(item.card_name.toLowerCase())) return;
    const uid = item.user_id;
    if (!userMap[uid]) userMap[uid] = { user: item.profiles, uid, theyHaveForMe: [], theyWantFromMe: [] };
    userMap[uid].theyHaveForMe.push(item);
  });

  (theyWantWhatIHave ?? []).forEach((item: any) => {
    if (excludedIds.has(item.user_id)) return;
    if (!myHaveNames.includes(item.card_name.toLowerCase())) return;
    const uid = item.user_id;
    if (!userMap[uid]) userMap[uid] = { user: item.profiles, uid, theyHaveForMe: [], theyWantFromMe: [] };
    userMap[uid].theyWantFromMe.push(item);
  });

  const matches = Object.values(userMap)
    .map((m: any) => ({
      ...m,
      perfectMatch: m.theyHaveForMe.length > 0 && m.theyWantFromMe.length > 0,
      overlapCount: m.theyHaveForMe.length + m.theyWantFromMe.length,
    }))
    .filter((m: any) => m.theyHaveForMe.length > 0 || m.theyWantFromMe.length > 0)
    .sort((a: any, b: any) => {
      if (b.perfectMatch !== a.perfectMatch) return b.perfectMatch ? 1 : -1;
      return b.overlapCount - a.overlapCount;
    });

  return NextResponse.json({ matches });
}
