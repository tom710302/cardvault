import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ blocked: false });

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_blocks")
    .select("id")
    .match({ blocker_id: user.id, blocked_id: params.id })
    .maybeSingle();

  return NextResponse.json({ blocked: !!data });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (params.id === user.id) return NextResponse.json({ error: "不能封鎖自己" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_blocks")
    .insert({ blocker_id: user.id, blocked_id: params.id });

  if (error?.code === "23505") return NextResponse.json({ blocked: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("user_blocks").delete().match({ blocker_id: user.id, blocked_id: params.id });
  return NextResponse.json({ blocked: false });
}
