import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const POKEMON_BASE = "https://asia.pokemon-card.com";

function parseCityFromAddress(address: string): string {
  const regions = ["台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣"];
  for (const c of regions) { if (address.includes(c)) return c; }
  return "其他";
}

async function fetchEventIds(): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const yyyy = today.getFullYear();
    const url = `${POKEMON_BASE}/tw/event-search/list/?pageNo=${page}&startDate=${mm}-${dd}-${yyyy}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) break;
    const html = await res.text();
    const regex = /href="\/tw\/event-search\/(\d+)\/"/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      if (!ids.includes(m[1])) ids.push(m[1]);
    }
    if (ids.length === 0 && page === 1) break;
  }
  return ids;
}

async function fetchEventDetail(id: string): Promise<Record<string, string> | null> {
  const url = `${POKEMON_BASE}/tw/event-search/${id}/`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const html = await res.text();

  // Title
  const titleM = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : `寶可夢賽事 #${id}`;

  // Date: 2026年06月11日 or 06-11-2026
  let start_date = "";
  const dateM1 = /(\d{4})年(\d{2})月(\d{2})日/.exec(html);
  const dateM2 = /(\d{2})-(\d{2})-(\d{4})/.exec(html);
  if (dateM1) start_date = `${dateM1[1]}-${dateM1[2]}-${dateM1[3]}`;
  else if (dateM2) start_date = `${dateM2[3]}-${dateM2[1]}-${dateM2[2]}`;

  // Time: 07:30 - 22:30 or 07:30〜22:30
  const timeM = /(\d{1,2}:\d{2})\s*[-〜～–—]\s*(\d{1,2}:\d{2})/.exec(html);
  const start_time = timeM ? timeM[1] : "";
  const end_time = timeM ? timeM[2] : "";

  // Address: look for postal code + address pattern
  const addrM = /(\d{3})\s*([^\s<"]{6,50})/.exec(html);
  const address = addrM ? addrM[2].replace(/[\r\n]/g, "").trim() : "";

  // Venue: look for text before/near address
  const venueM = /class="[^"]*(?:shop|venue|place|tournament)[^"]*"[^>]*>([\s\S]{2,40}?)<\//i.exec(html);
  const venue_name = venueM
    ? venueM[1].replace(/<[^>]+>/g, "").trim()
    : (address ? address.slice(0, 15) : `賽場 #${id}`);

  // Fee
  const feeM = /[\$＄]?\s*(\d+)\s*(元|円|TWD|NTD)/i.exec(html);
  const entry_fee = feeM ? feeM[1] : "";

  // Max participants
  const maxM = /(?:定員|人數上限|上限)\D*?(\d+)\s*[人名]/i.exec(html)
    ?? /(\d+)\s*[人名]\s*(?:限|上限|定員)/i.exec(html);
  const max_participants = maxM ? maxM[1] : "";

  return { source_id: id, title, start_date, start_time, end_time, address, venue_name, city: parseCityFromAddress(address), entry_fee, max_participants, registration_url: url };
}

export async function POST(_req: NextRequest) {
  // 驗證 admin
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "moderator"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "需要管理員權限" }, { status: 403 });
  }

  let synced = 0, skipped = 0, errors = 0;
  try {
    const ids = await fetchEventIds();

    for (const id of ids) {
      const { data: existing } = await admin.from("events")
        .select("id").eq("source_id", id).eq("source", "official_pokemon").single();
      if (existing) { skipped++; continue; }

      const detail = await fetchEventDetail(id);
      if (!detail?.start_date) { errors++; continue; }

      const { error } = await admin.from("events").insert({
        title: detail.title,
        game: "寶可夢",
        event_type: "official",
        start_date: detail.start_date,
        start_time: detail.start_time || null,
        end_time: detail.end_time || null,
        venue_name: detail.venue_name,
        address: detail.address || null,
        city: detail.city,
        entry_fee: detail.entry_fee ? parseInt(detail.entry_fee) : null,
        max_participants: detail.max_participants ? parseInt(detail.max_participants) : null,
        registration_url: detail.registration_url,
        source: "official_pokemon",
        source_id: detail.source_id,
        status: "approved",
      });
      if (error) { errors++; } else { synced++; }
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (e) {
    return NextResponse.json({ error: String(e), synced, skipped, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true, synced, skipped, errors });
}
