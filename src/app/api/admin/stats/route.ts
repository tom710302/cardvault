import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "無權限" }, { status: 403 });

  const [users, posts, cards, collections] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    admin.from("cards").select("id", { count: "exact", head: true }),
    admin.from("collections").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    users: users.count ?? 0,
    posts: posts.count ?? 0,
    cards: cards.count ?? 0,
    collections: collections.count ?? 0,
  });
}
