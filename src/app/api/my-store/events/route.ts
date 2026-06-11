import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getStoreOwner() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, store_id").eq("id", user.id).single();
  if (!profile?.store_id || !["store_owner", "admin"].includes(profile.role ?? "")) return null;
  return { user, profile };
}

export async function GET() {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { data } = await supabase.from("store_events")
    .select("*").eq("store_id", owner.profile.store_id!).order("created_at", { ascending: false });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { title, description, event_date, end_date, location, registration_url, registration_info, image_url, image_urls } = await request.json();
  if (!title) return NextResponse.json({ error: "活動名稱為必填" }, { status: 400 });

  const { data, error } = await supabase.from("store_events")
    .insert({
      store_id: owner.profile.store_id!, title, description,
      event_date: event_date || null, end_date: end_date || null,
      location: location || null, registration_url: registration_url || null,
      registration_info: registration_info || null,
      image_url: image_url || null, image_urls: image_urls?.length ? image_urls : null,
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-post to community
  const { data: store } = await supabase.from("stores").select("name").eq("id", owner.profile.store_id!).single();
  const storeName = store?.name ?? "店家";
  const dateStr = event_date ? new Date(event_date).toLocaleDateString("zh-TW") : "時間待定";
  const endDateStr = end_date ? ` ~ ${new Date(end_date).toLocaleDateString("zh-TW")}` : "";
  const lines = [
    description ?? "",
    "",
    `📅 活動時間：${dateStr}${endDateStr}`,
    `📍 活動地點：${location ?? "待定"}`,
    registration_info ? `📋 報名資訊：${registration_info}` : "",
    registration_url ? `🔗 報名連結：${registration_url}` : "",
  ].filter(Boolean);
  const { data: post } = await supabase.from("posts").insert({
    title: `【活動公告】${storeName} · ${title}`,
    content: lines.join("\n").trim(),
    board: "store",
    post_type: "news",
    author_id: owner.user.id,
    image_urls: image_urls?.length ? image_urls : (image_url ? [image_url] : null),
  }).select("id").single();

  // Link post back to event so we can delete it later
  if (post?.id) {
    await supabase.from("store_events").update({ community_post_id: post.id }).eq("id", data.id);
  }

  return NextResponse.json({ event: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { id } = await request.json();

  // Find and remove the linked community post
  const { data: event } = await supabase.from("store_events")
    .select("community_post_id").eq("id", id).eq("store_id", owner.profile.store_id!).single();

  if (event?.community_post_id) {
    await supabase.from("posts").update({ is_deleted: true }).eq("id", event.community_post_id);
  }

  await supabase.from("store_events").update({ is_active: false }).eq("id", id).eq("store_id", owner.profile.store_id!);
  return NextResponse.json({ success: true });
}
