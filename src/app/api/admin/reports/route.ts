import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("post_reports")
    .select("*, posts(id, title, is_deleted), reporter:profiles!post_reports_reporter_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { id, action, post_id } = await request.json();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (action === "dismiss") {
    await admin.from("post_reports").update({ status: "dismissed", reviewed_at: now, reviewed_by: user.id }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_post" && post_id) {
    await admin.from("posts").update({ is_deleted: true }).eq("id", post_id);
    await admin.from("post_reports").update({ status: "resolved", reviewed_at: now, reviewed_by: user.id }).eq("post_id", post_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
