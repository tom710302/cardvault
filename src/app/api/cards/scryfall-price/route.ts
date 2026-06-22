import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (!name) return NextResponse.json({ error: "缺少 name" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
      {
        headers: { "User-Agent": "CardVault/1.0" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return NextResponse.json({ error: "找不到此卡牌" }, { status: 404 });
    const data = await res.json();
    return NextResponse.json({
      usd: data.prices?.usd ?? null,
      usd_foil: data.prices?.usd_foil ?? null,
      usd_etched: data.prices?.usd_etched ?? null,
      scryfall_uri: data.scryfall_uri ?? null,
      image_uri: data.image_uris?.normal ?? null,
    });
  } catch {
    return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
  }
}
