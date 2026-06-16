import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import StoreDetailClient from "./StoreDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: store } = await admin
    .from("stores")
    .select("name, city, address, intro, description, image_url")
    .eq("id", params.id)
    .single();

  if (!store) return { title: "找不到店舖" };

  const title = `${store.name} — ${store.city}`;
  const description = store.intro || store.description || `${store.city} ${store.address} — 查看營業時間、販售商品與活動資訊。`;

  return {
    title,
    description,
    openGraph: { title, description, images: store.image_url ? [store.image_url] : undefined },
    twitter: { card: "summary_large_image", title, description, images: store.image_url ? [store.image_url] : undefined },
  };
}

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  return <StoreDetailClient id={params.id} />;
}
