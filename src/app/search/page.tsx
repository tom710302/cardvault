"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/useScrollLock";
import Link from "next/link";
import Image from "next/image";
import {
  Search, MapPin, Phone, Clock, Globe, CheckCircle, Navigation,
  Calendar, Users, ExternalLink, Plus, X, ChevronDown, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

/* ─── Types ─── */
interface Store {
  id: string; name: string; address: string; city: string;
  phone: string | null; website: string | null; hours: string | null;
  description: string | null; image_url: string | null;
  games: string[]; is_verified: boolean; created_at: string;
}
interface Event {
  id: string; title: string; game: string; event_type: string;
  start_date: string; end_date: string | null; start_time: string | null; end_time: string | null;
  venue_name: string; address: string | null; city: string;
  entry_fee: number | null; max_participants: number | null;
  registration_url: string | null; description: string | null;
  source: string; status: string;
  profiles: { username: string; display_name: string | null } | null;
}

/* ─── Constants ─── */
const cities = ["全部", "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市", "其他"];
const gameOptions = ["全部", "MTG", "寶可夢", "遊戲王", "NBA", "MLB", "NFL", "WS"];
const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", NFL: "🏈", WS: "🎴", 其他: "🃏" };
const eventTypeLabel: Record<string, { label: string; color: string }> = {
  official: { label: "官方賽事", color: "text-yellow-400 bg-yellow-900/30" },
  community: { label: "社群賽事", color: "text-blue-400 bg-blue-900/30" },
  store: { label: "店家賽事", color: "text-purple-400 bg-purple-900/30" },
};
const defaultForm = {
  title: "", game: "寶可夢", event_type: "community",
  start_date: "", end_date: "", start_time: "", end_time: "",
  venue_name: "", address: "", city: "台北市",
  entry_fee: "", max_participants: "", format: "", registration_url: "", description: "",
};

/* ═══════════════════════════════════════════════════ */
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") ?? "stores") as "stores" | "events";

  function setTab(t: "stores" | "events") {
    router.replace(`/search?tab=${t}`);
  }

  /* ─── Stores state ─── */
  const [stores, setStores] = useState<Store[]>([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCity, setStoreCity] = useState("全部");
  const [storeGame, setStoreGame] = useState("全部");
  const [storesLoading, setStoresLoading] = useState(false);

  /* ─── Events state ─── */
  const [events, setEvents] = useState<Event[]>([]);
  const [eventSearch, setEventSearch] = useState("");
  const [eventGame, setEventGame] = useState("全部");
  const [eventCity, setEventCity] = useState("全部");
  const [showPast, setShowPast] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  useScrollLock(showSubmit);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  /* ─── Fetch stores ─── */
  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    let url = "/api/stores?";
    if (storeCity !== "全部") url += `city=${encodeURIComponent(storeCity)}&`;
    if (storeGame !== "全部") url += `game=${encodeURIComponent(storeGame)}&`;
    if (storeSearch) url += `search=${encodeURIComponent(storeSearch)}`;
    const res = await fetch(url);
    if (res.ok) { const { stores } = await res.json(); setStores(stores ?? []); }
    setStoresLoading(false);
  }, [storeCity, storeGame, storeSearch]);

  useEffect(() => {
    if (tab === "stores") { const t = setTimeout(fetchStores, 300); return () => clearTimeout(t); }
  }, [tab, fetchStores]);

  /* ─── Fetch events ─── */
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    let url = `/api/events?upcoming=${!showPast}`;
    if (eventGame !== "全部") url += `&game=${encodeURIComponent(eventGame)}`;
    if (eventCity !== "全部") url += `&city=${encodeURIComponent(eventCity)}`;
    const res = await fetch(url);
    if (res.ok) { const { events } = await res.json(); setEvents(events ?? []); }
    setEventsLoading(false);
  }, [eventGame, eventCity, showPast]);

  useEffect(() => {
    if (tab === "events") { fetchEvents(); }
  }, [tab, fetchEvents]);

  /* ─── Helpers ─── */
  function openGoogleMaps(store: Store) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name + " " + store.address)}`, "_blank");
  }
  function openNavigation(store: Store) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`, "_blank");
  }
  function formatDate(date: string) {
    const d = new Date(date);
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${weekdays[d.getDay()]})`;
  }
  function isToday(date: string) { return new Date(date).toDateString() === new Date().toDateString(); }
  function isThisWeek(date: string) {
    const diff = (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  const filteredEvents = events.filter(e =>
    !eventSearch || e.title.toLowerCase().includes(eventSearch.toLowerCase()) || e.venue_name.toLowerCase().includes(eventSearch.toLowerCase())
  );
  const grouped: Record<string, Event[]> = {};
  for (const e of filteredEvents) {
    if (!grouped[e.start_date]) grouped[e.start_date] = [];
    grouped[e.start_date].push(e);
  }

  async function submitEvent(ev: React.FormEvent) {
    ev.preventDefault();
    if (!user) { toast.error("請先登入"); return; }
    setSubmitting(true);
    const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setShowSubmit(false); setForm(defaultForm);
      toast.success("賽事已送出，等待審核後將顯示於列表。");
      fetchEvents();
    } else { const { error } = await res.json(); toast.error(error ?? "送出失敗"); }
    setSubmitting(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">資料查詢</h1>
        <p className="text-gray-400 text-sm mt-1">查詢卡牌店鋪位置與各地賽事資訊</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("stores")}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            tab === "stores" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
          )}>
          <MapPin className="w-4 h-4" /> 店鋪查詢
        </button>
        <button onClick={() => setTab("events")}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            tab === "events" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
          )}>
          <Calendar className="w-4 h-4" /> 賽事查詢
        </button>
      </div>

      {/* ═══ STORES TAB ═══ */}
      {tab === "stores" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{stores.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">搜尋結果</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stores.filter(s => s.is_verified).length}</div>
              <div className="text-xs text-gray-500 mt-0.5">已驗證店舖</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-brand-400">{new Set(stores.map(s => s.city)).size}</div>
              <div className="text-xs text-gray-500 mt-0.5">涵蓋城市</div>
            </div>
          </div>

          {/* Filters */}
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input value={storeSearch} onChange={e => setStoreSearch(e.target.value)} placeholder="搜尋店舖名稱..."
                className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">📍 城市</p>
              <div className="flex gap-2 flex-wrap">
                {cities.map(c => (
                  <button key={c} onClick={() => setStoreCity(c)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      storeCity === c ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    )}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">🃏 卡牌種類</p>
              <div className="flex gap-2 flex-wrap">
                {gameOptions.map(g => (
                  <button key={g} onClick={() => setStoreGame(g)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      storeGame === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    )}>{gameEmoji[g] ?? ""} {g}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Store List */}
          {storesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-48 shimmer" />)}
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-3">
              <MapPin className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-lg">找不到符合條件的店舖</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map(store => (
                <div key={store.id} className="glass rounded-2xl overflow-hidden card-hover group">
                  <Link href={`/stores/${store.id}`} className="block">
                    <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                      {store.image_url
                        ? <Image src={store.image_url} alt={store.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-10 h-10 text-gray-600" /></div>
                      }
                      {store.is_verified && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-green-900/80 text-green-400 text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                          <CheckCircle className="w-3 h-3" /> 已驗證
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{store.city}</div>
                    </div>
                  </Link>
                  <div className="p-4 space-y-3">
                    <div>
                      <Link href={`/stores/${store.id}`}>
                        <h3 className="font-bold text-white text-lg hover:text-brand-300 transition-colors">{store.name}</h3>
                      </Link>
                      {store.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{store.description}</p>}
                    </div>
                    {store.games.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {store.games.map(g => (
                          <span key={g} className="badge text-xs bg-brand-900/30 text-brand-300 border border-brand-700/30">{gameEmoji[g] ?? ""} {g}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-600" />
                        <span className="text-xs text-gray-400">{store.address}</span>
                      </div>
                      {store.hours && <div className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0 text-gray-600" /><span className="text-xs text-gray-400">{store.hours}</span></div>}
                      {store.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0 text-gray-600" /><a href={`tel:${store.phone}`} className="text-xs text-gray-400 hover:text-brand-400">{store.phone}</a></div>}
                      {store.website && <div className="flex items-center gap-2"><Globe className="w-4 h-4 shrink-0 text-gray-600" /><a href={store.website} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:text-brand-300 truncate">{store.website.replace(/^https?:\/\//, "")}</a></div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openGoogleMaps(store)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-sm font-medium border border-brand-700/30 transition-colors">
                        <MapPin className="w-4 h-4" /> 查看地圖
                      </button>
                      <button onClick={() => openNavigation(store)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 text-sm font-medium border border-green-700/30 transition-colors">
                        <Navigation className="w-4 h-4" /> 導航前往
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="glass rounded-xl p-4 flex items-start gap-3 text-sm text-gray-500">
            <span className="text-lg shrink-0">💡</span>
            <p>找不到你的店舖？請聯絡管理員新增，或在<Link href="/community" className="text-brand-400 mx-1">社群討論</Link>留言告知。</p>
          </div>
        </div>
      )}

      {/* ═══ EVENTS TAB ═══ */}
      {tab === "events" && (
        <div className="space-y-6">
          {/* Header actions */}
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{filteredEvents.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">搜尋結果</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{filteredEvents.filter(e => e.source === "official_pokemon").length}</div>
                <div className="text-xs text-gray-500 mt-0.5">官方寶可夢賽</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-brand-400">{new Set(filteredEvents.map(e => e.city)).size}</div>
                <div className="text-xs text-gray-500 mt-0.5">涵蓋城市</div>
              </div>
            </div>
            <button onClick={() => user ? setShowSubmit(true) : window.location.href = "/auth/login"}
              className="btn-primary flex items-center gap-2 text-sm shrink-0">
              <Plus className="w-4 h-4" /> 新增賽事
            </button>
          </div>

          {/* Filters */}
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="搜尋賽事名稱或場地..."
                className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">🃏 遊戲種類</p>
              <div className="flex gap-2 flex-wrap">
                {["全部", "寶可夢", "MTG", "遊戲王", "NBA", "MLB", "其他"].map(g => (
                  <button key={g} onClick={() => setEventGame(g)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      eventGame === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    )}>{gameEmoji[g] ?? ""} {g}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">📍 城市</p>
              <div className="flex gap-2 flex-wrap">
                {cities.map(c => (
                  <button key={c} onClick={() => setEventCity(c)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      eventCity === c ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    )}>{c}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-brand-500" />
                <span className="text-sm text-gray-400">顯示過去賽事</span>
              </label>
              <button onClick={fetchEvents} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> 重新整理
              </button>
            </div>
          </div>

          {/* Events list */}
          {eventsLoading ? (
            <div className="space-y-4">{Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-28 shimmer" />)}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-3">
              <Calendar className="w-12 h-12 mx-auto opacity-30" />
              <p>找不到符合條件的賽事</p>
              <button onClick={() => setShowSubmit(true)} className="btn-primary text-sm mt-2">+ 新增賽事</button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("px-3 py-1 rounded-full text-sm font-bold",
                      isToday(date) ? "bg-brand-600 text-white" : isThisWeek(date) ? "bg-green-900/50 text-green-300" : "bg-white/5 text-gray-400"
                    )}>
                      {isToday(date) ? "🔴 今天" : isThisWeek(date) ? "🟢 本週" : ""} {formatDate(date)}
                    </div>
                    <span className="text-xs text-gray-600">{dayEvents.length} 場</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dayEvents.map(event => {
                      const typeInfo = eventTypeLabel[event.event_type] ?? { label: event.event_type, color: "text-gray-400 bg-gray-800" };
                      return (
                        <Link href={`/events/${event.id}`} key={event.id} className="glass rounded-2xl overflow-hidden card-hover block">
                          <div className={cn("h-1.5", event.source === "official_pokemon" ? "bg-yellow-500" : event.event_type === "community" ? "bg-brand-500" : "bg-purple-500")} />
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="badge text-xs bg-white/5 text-gray-300">{gameEmoji[event.game] ?? "🃏"} {event.game}</span>
                              <span className={`badge text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                              {event.source === "official_pokemon" && <span className="badge text-xs text-yellow-400 bg-yellow-900/30">官方同步</span>}
                            </div>
                            <h3 className="font-bold text-white text-base line-clamp-2">{event.title}</h3>
                            <div className="space-y-1.5 text-sm text-gray-400">
                              {(event.start_time || event.end_time) && (
                                <div className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0 text-gray-600" /><span className="text-xs">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span></div>
                              )}
                              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0 text-gray-600" /><span className="text-xs">{event.venue_name}・{event.city}</span></div>
                              <div className="flex items-center gap-4 text-xs">
                                {event.entry_fee !== null && <span>💰 {event.entry_fee === 0 ? "免費" : `NT$${event.entry_fee}`}</span>}
                                {event.max_participants && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.max_participants} 人</span>}
                              </div>
                            </div>
                            {event.description && (
                              <div>
                                <button onClick={e => { e.preventDefault(); setExpandedId(expandedId === event.id ? null : event.id); }}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
                                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expandedId === event.id && "rotate-180")} />
                                  {expandedId === event.id ? "收起" : "更多資訊"}
                                </button>
                                {expandedId === event.id && <p className="mt-2 text-xs text-gray-400">{event.description}</p>}
                              </div>
                            )}
                            <div className="flex gap-2">
                              {event.address && (
                                <button onClick={e => { e.preventDefault(); window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name + " " + event.address)}`, "_blank"); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-xs font-medium border border-brand-700/30 transition-colors">
                                  <MapPin className="w-3.5 h-3.5" /> 地圖
                                </button>
                              )}
                              {event.registration_url && (
                                <a href={event.registration_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 text-xs font-medium border border-green-700/30 transition-colors">
                                  <ExternalLink className="w-3.5 h-3.5" /> 報名
                                </a>
                              )}
                            </div>
                            <p className="text-[10px] text-brand-500/60 font-medium">點擊查看詳細資訊 →</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="glass rounded-xl p-4 flex items-start gap-3 text-sm text-gray-500">
            <span className="text-lg shrink-0">⚡</span>
            <p>官方賽事每日自動從寶可夢卡牌官網同步。其他賽事歡迎社群回報，由管理員審核後顯示。</p>
          </div>
        </div>
      )}

      {/* Submit Event Modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-brand-400" /> 新增賽事</h2>
              <button onClick={() => setShowSubmit(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500">提交後由管理員審核，管理員帳號直接上線。</p>
            <form onSubmit={submitEvent} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">賽事名稱 *</label>
                <input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} required placeholder="例：寶可夢卡牌日、MTG FNM..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">遊戲種類 *</label>
                  <select value={form.game} onChange={e => setForm(v => ({ ...v, game: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {["寶可夢", "MTG", "遊戲王", "NBA", "MLB", "其他"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">賽事性質</label>
                  <select value={form.event_type} onChange={e => setForm(v => ({ ...v, event_type: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    <option value="community">社群賽事</option>
                    <option value="store">店家賽事</option>
                    <option value="official">官方賽事</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">開始日期 *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(v => ({ ...v, start_date: e.target.value }))} required
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">結束日期</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(v => ({ ...v, end_date: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">開始時間</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(v => ({ ...v, start_time: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">結束時間</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(v => ({ ...v, end_time: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">場地名稱 *</label>
                <input value={form.venue_name} onChange={e => setForm(v => ({ ...v, venue_name: e.target.value }))} required placeholder="例：XX 卡牌店"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">地址</label>
                  <input value={form.address} onChange={e => setForm(v => ({ ...v, address: e.target.value }))} placeholder="詳細地址"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">城市 *</label>
                  <select value={form.city} onChange={e => setForm(v => ({ ...v, city: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {["台北市","新北市","桃園市","台中市","台南市","高雄市","其他"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">報名費（NT$）</label>
                  <input type="number" value={form.entry_fee} onChange={e => setForm(v => ({ ...v, entry_fee: e.target.value }))} placeholder="0 = 免費"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">人數上限</label>
                  <input type="number" value={form.max_participants} onChange={e => setForm(v => ({ ...v, max_participants: e.target.value }))} placeholder="不限則留空"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">報名連結</label>
                <input type="url" value={form.registration_url} onChange={e => setForm(v => ({ ...v, registration_url: e.target.value }))} placeholder="https://..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">賽事說明</label>
                <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={3} placeholder="賽制、規則、注意事項..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowSubmit(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={submitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {submitting ? "送出中..." : "送出審核"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
