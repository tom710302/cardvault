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
  const { data } = await supabase.from("store_products")
    .select("*").eq("store_id", owner.profile.store_id!).order("created_at", { ascending: false });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { name, description, price, stock, image_url, category } = await request.json();
  if (!name) return NextResponse.json({ error: "商品名稱為必填" }, { status: 400 });

  const { data, error } = await supabase.from("store_products")
    .insert({ store_id: owner.profile.store_id!, name, description, price: price || null, stock: stock ?? 0, image_url: image_url || null, category: category || null })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-post to community
  const { data: store } = await supabase.from("stores").select("name").eq("id", owner.profile.store_id!).single();
  const storeName = store?.name ?? "店家";
  const lines = [
    description ?? "",
    "",
    `分類：${category ?? "一般"}`,
    `售價：${price ? `NT$${Number(price).toLocaleString()}` : "價格面議"}`,
    `庫存：${stock ?? 0} 件`,
    "",
    `📍 [前往店鋪查看更多商品](/stores/${owner.profile.store_id})`,
  ];
  await supabase.from("posts").insert({
    title: `【商品上架】${storeName} · ${name}`,
    content: lines.join("\n").trim(),
    board: "store",
    post_type: "news",
    author_id: owner.user.id,
    image_urls: image_url ? [image_url] : null,
  });

  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { id, ...updates } = await request.json();
  const { data, error } = await supabase.from("store_products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id).eq("store_id", owner.profile.store_id!).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(request: NextRequest) {
  const owner = await getStoreOwner();
  if (!owner) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const supabase = createClient();
  const { id } = await request.json();
  await supabase.from("store_products").update({ is_active: false }).eq("id", id).eq("store_id", owner.profile.store_id!);
  return NextResponse.json({ success: true });
}
