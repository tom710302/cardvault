import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import CardDetailClient from "./CardDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: card } = await admin
    .from("cards")
    .select("name, name_en, game, set_name, rarity, description, image_url")
    .eq("id", params.id)
    .single();

  if (!card) return { title: "找不到卡牌" };

  const title = card.name_en ? `${card.name}（${card.name_en}）` : card.name;
  const description = card.description
    ?? `${[card.game, card.set_name, card.rarity].filter(Boolean).join(" · ")} — 查看市場價格、社群回報與收藏資訊。`;

  return {
    title,
    description,
    openGraph: { title, description, images: card.image_url ? [card.image_url] : undefined },
    twitter: { card: "summary_large_image", title, description, images: card.image_url ? [card.image_url] : undefined },
  };
}

export default function CardDetailPage({ params }: { params: { id: string } }) {
  return <CardDetailClient id={params.id} />;
}
