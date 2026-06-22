import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  const admin = createAdminClient();

  // Get followed user IDs
  const { data: follows } = await admin
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (!follows?.length) return NextResponse.json({ items: [] });

  const followingIds = follows.map((f: any) => f.following_id);

  // Fetch activity in parallel
  const [{ data: posts }, { data: haves }, { data: colls }] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, board, post_type, created_at, author_id")
      .in("author_id", followingIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("trade_haves")
      .select("id, card_name, card_game, condition, image_url, created_at, user_id")
      .in("user_id", followingIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("collections")
      .select("id, created_at, user_id, cards(id, name, game, image_url)")
      .in("user_id", followingIds)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Fetch profiles for all involved users
  const allUserIds = Array.from(new Set([
    ...(posts ?? []).map((p: any) => p.author_id),
    ...(haves ?? []).map((h: any) => h.user_id),
    ...(colls ?? []).map((c: any) => c.user_id),
  ]));

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", allUserIds);

  const pm: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { pm[p.id] = p; });

  // Merge into unified feed items
  const items: any[] = [
    ...(posts ?? []).map((p: any) => ({
      kind: "post" as const,
      id: p.id,
      created_at: p.created_at,
      user: pm[p.author_id] ?? null,
      title: p.title,
      board: p.board,
      post_type: p.post_type,
      link: `/community/${p.id}`,
    })),
    ...(haves ?? []).map((h: any) => ({
      kind: "trade_have" as const,
      id: h.id,
      created_at: h.created_at,
      user: pm[h.user_id] ?? null,
      card_name: h.card_name,
      card_game: h.card_game,
      condition: h.condition,
      image_url: h.image_url,
      link: `/users/${h.user_id}`,
    })),
    ...(colls ?? []).map((c: any) => ({
      kind: "collection" as const,
      id: c.id,
      created_at: c.created_at,
      user: pm[c.user_id] ?? null,
      card_name: c.cards?.name ?? null,
      card_game: c.cards?.game ?? null,
      image_url: c.cards?.image_url ?? null,
      link: c.cards?.id ? `/cards/${c.cards.id}` : `/users/${c.user_id}`,
    })),
  ];

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ items: items.slice(0, 40) });
}
