import { NextRequest, NextResponse } from "next/server";
import zhNames from "@/data/pokemon-names-zh.json";

const ZH_TO_EN = zhNames as Record<string, string>;

function translateQuery(q: string): string {
  const trimmed = q.trim();
  // Exact match first
  if (ZH_TO_EN[trimmed]) return ZH_TO_EN[trimmed];
  // Partial match (e.g. "超夢X" → find "超夢" → "Mewtwo")
  for (const [zh, en] of Object.entries(ZH_TO_EN)) {
    if (trimmed.includes(zh)) return en;
  }
  return q;
}

interface NormalizedCard {
  id: string;
  name: string;
  game: string;
  image_url: string | null;
  set_name: string | null;
  rarity: string | null;
}

async function searchPokemon(q: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(q)}*"&pageSize=20&orderBy=name`,
    { headers: { "X-Api-Key": process.env.POKEMON_TCG_API_KEY ?? "" }, next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    game: "寶可夢",
    image_url: c.images?.small ?? c.images?.large ?? null,
    set_name: c.set?.name ?? null,
    rarity: c.rarity ?? null,
  }));
}

async function searchMTG(q: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name&unique=cards`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []).slice(0, 20).map((c: any) => ({
    id: c.id,
    name: c.name,
    game: "MTG",
    image_url: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null,
    set_name: c.set_name ?? null,
    rarity: c.rarity ?? null,
  }));
}

async function searchYugioh(q: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(q)}&num=20&offset=0`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []).map((c: any) => ({
    id: String(c.id),
    name: c.name,
    game: "遊戲王",
    image_url: c.card_images?.[0]?.image_url_small ?? null,
    set_name: null,
    rarity: c.type ?? null,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const game = searchParams.get("game") ?? "";

  if (!q || q.length < 1) return NextResponse.json({ cards: [] });

  try {
    let cards: NormalizedCard[] = [];
    if (game === "寶可夢") cards = await searchPokemon(translateQuery(q));
    else if (game === "MTG") cards = await searchMTG(q);
    else if (game === "遊戲王") cards = await searchYugioh(q);
    else cards = [];
    return NextResponse.json({ cards });
  } catch (e) {
    return NextResponse.json({ cards: [], error: "外部 API 查詢失敗" });
  }
}
