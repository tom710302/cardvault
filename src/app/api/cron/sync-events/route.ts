import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POKEMON_BASE = "https://asia.pokemon-card.com";

function parseCityFromAddress(address: string): string {
  const cities = ["台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市", "基隆市", "新竹市", "嘉義市"];
  const counties = ["新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣"];
  for (const c of [...cities, ...counties]) {
    if (address.includes(c)) return c;
  }
  return "其他";
}

async function fetchEventList(pageNo: number): Promise<{ id: string; date: string }[]> {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const yyyy = today.getFullYear();
  const url = `${POKEMON_BASE}/tw/event-search/list/?pageNo=${pageNo}&startDate=${mm}-${dd}-${yyyy}`;

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
  if (!res.ok) return [];
  const html = await res.text();

  const events: { id: string; date: string }[] = [];
  const linkRegex = /href="\/tw\/event-search\/(\d+)\/"/g;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    events.push({ id: m[1], date: "" });
  }
  return events;
}

async function fetchEventDetail(id: string): Promise<Record<string, string> | null> {
  const url = `${POKEMON_BASE}/tw/event-search/${id}/`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
  if (!res.ok) return null;
  const html = await res.text();

  function extract(pattern: RegExp): string {
    const m = pattern.exec(html);
    return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  }

  const titleMatch = /<h1[^>]*class="[^"]*tournament-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html)
    ?? /<title>(.*?)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const dateMatch = /(\d{4})年(\d{2})月(\d{2})日/.exec(html)
    ?? /(\d{2})-(\d{2})-(\d{4})/.exec(html);
  let start_date = "";
  if (dateMatch) {
    if (dateMatch[0].includes("年")) {
      start_date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    } else {
      start_date = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
    }
  }

  const timeMatch = /(\d{2}:\d{2})\s*[〜～\-–—]\s*(\d{2}:\d{2})/.exec(html);
  const start_time = timeMatch ? timeMatch[1] : "";
  const end_time = timeMatch ? timeMatch[2] : "";

  const addressMatch = /(\d{3})\s*([^\s<]{5,50}[路街道巷弄號樓])/.exec(html);
  const address = addressMatch ? addressMatch[2] : "";

  const venueMatch = /<[^>]*class="[^"]*shop-name[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/.exec(html)
    ?? /<[^>]*class="[^"]*venue[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/.exec(html);
  const venue_name = venueMatch ? venueMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const feeMatch = /(\d+)\s*(元|円|TWD)/.exec(html);
  const entry_fee = feeMatch ? feeMatch[1] : "";

  const maxMatch = /(\d+)\s*(人|名)/.exec(html);
  const max_participants = maxMatch ? maxMatch[1] : "";

  return {
    source_id: id,
    title: title || `寶可夢賽事 #${id}`,
    start_date,
    start_time,
    end_time,
    address,
    venue_name: venue_name || address.slice(0, 20) || `賽場 #${id}`,
    city: parseCityFromAddress(address),
    entry_fee,
    max_participants,
    registration_url: url,
    game: "寶可夢",
    event_type: "official",
    source: "official_pokemon",
    status: "approved",
  };
}

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // 只抓前3頁（約60個近期賽事），避免過度爬取
    for (let page = 1; page <= 3; page++) {
      const eventLinks = await fetchEventList(page);
      if (eventLinks.length === 0) break;

      for (const { id } of eventLinks) {
        // 檢查是否已存在
        const { data: existing } = await admin
          .from("events")
          .select("id")
          .eq("source_id", id)
          .eq("source", "official_pokemon")
          .single();

        if (existing) { skipped++; continue; }

        const detail = await fetchEventDetail(id);
        if (!detail || !detail.start_date) { errors++; continue; }

        const { error } = await admin.from("events").insert({
          title: detail.title,
          game: detail.game,
          event_type: detail.event_type,
          start_date: detail.start_date,
          start_time: detail.start_time || null,
          end_time: detail.end_time || null,
          venue_name: detail.venue_name,
          address: detail.address || null,
          city: detail.city,
          entry_fee: detail.entry_fee ? parseInt(detail.entry_fee) : null,
          max_participants: detail.max_participants ? parseInt(detail.max_participants) : null,
          registration_url: detail.registration_url,
          source: detail.source,
          source_id: detail.source_id,
          status: detail.status,
        });

        if (error) { errors++; } else { synced++; }

        // 禮貌間隔，避免對官網造成負擔
        await new Promise(r => setTimeout(r, 300));
      }
    }
  } catch (e) {
    return NextResponse.json({ error: String(e), synced, skipped, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true, synced, skipped, errors });
}
