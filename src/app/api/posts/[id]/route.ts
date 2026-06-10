import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`*, profiles(id, username, display_name, avatar_url, reputation, role)`)
    .eq("id", params.id)
    .eq("is_deleted", false)
    .single();
  if (error) return NextResponse.json({ error: "找不到文章" }, { status: 404 });

  // 增加瀏覽數
  await supabase.from("posts").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", params.id);
  return NextResponse.json({ post: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  // 用 admin client 查詢和更新，繞過 RLS
  const admin = createAdminClient();
  const { data: post } = await admin.from("posts").select("author_id").eq("id", params.id).single();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();

  if (post?.author_id !== user.id && !["admin", "moderator"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const { error } = await admin.from("posts").update({ is_deleted: true }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
