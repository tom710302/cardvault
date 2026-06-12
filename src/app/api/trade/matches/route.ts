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

  // Find all other users' haves and wants
  const myHaveNames = (myHaves ?? []).map((h: any) => h.card_name.toLowerCase());
  const myWantNames = (myWants ?? []).map((w: any) => w.card_name.toLowerCase());

  // Users who have what I want
  const { data: theyHaveWhatIWant } = await admin
    .from("trade_haves")
    .select("*, profiles(id, username, display_name, avatar_url)")
    .neq("user_id", user.id)
    .eq("is_active", true);

  // Users who want what I have
  const { data: theyWantWhatIHave } = await admin
    .from("trade_wants")
    .select("*, profiles(id, username, display_name, avatar_url)")
    .neq("user_id", user.id)
    .eq("is_active", true);

  // Group by user and find matches
  const userMap: Record<string, any> = {};

  (theyHaveWhatIWant ?? []).forEach((item: any) => {
    if (!myWantNames.includes(item.card_name.toLowerCase())) return;
    const uid = item.user_id;
    if (!userMap[uid]) userMap[uid] = { user: item.profiles, uid, theyHaveForMe: [], theyWantFromMe: [], perfectMatch: false };
    userMap[uid].theyHaveForMe.push(item);
  });

  (theyWantWhatIHave ?? []).forEach((item: any) => {
    if (!myHaveNames.includes(item.card_name.toLowerCase())) return;
    const uid = item.user_id;
    if (!userMap[uid]) userMap[uid] = { user: item.profiles, uid, theyHaveForMe: [], theyWantFromMe: [], perfectMatch: false };
    userMap[uid].theyWantFromMe.push(item);
  });

  const matches = Object.values(userMap)
    .map((m: any) => ({ ...m, perfectMatch: m.theyHaveForMe.length > 0 && m.theyWantFromMe.length > 0 }))
    .filter((m: any) => m.theyHaveForMe.length > 0 || m.theyWantFromMe.length > 0)
    .sort((a: any, b: any) => (b.perfectMatch ? 1 : 0) - (a.perfectMatch ? 1 : 0));

  return NextResponse.json({ matches });
}
