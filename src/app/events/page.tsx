"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Calendar, MapPin, Clock, Users, ExternalLink, Plus, X, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Event {
  id: string;
  title: string;
  game: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string;
  address: string | null;
  city: string;
  entry_fee: number | null;
  max_participants: number | null;
  format: string | null;
  registration_url: string | null;
  description: string | null;
  source: string;
  status: string;
  submitted_by: string | null;
  profiles: { username: string; display_name: string | null } | null;
}

const gameOptions = ["全部", "寶可夢", "MTG", "遊戲王", "NBA", "MLB", "其他"];
const gameEmoji: Record<string, string> = {
  寶可夢: "⚡", MTG: "⚔️", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", 其他: "🃏",
};
const cities = ["全部", "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市", "其他"];

const eventTypeLabel: Record<string, { label: string; color: string }> = {
  official: { label: "官方賽事", color: "text-yellow-400 bg-yellow-900/30" },
  community: { label: "社群賽事", color: "text-blue-400 bg-blue-900/30" },
  store: { label: "店家賽事", color: "text-purple-400 bg-purple-900/30" },
};

const defaultForm = {
  title: "", game: "寶可夢", event_type: "community",
  start_date: "", end_date: "", start_time: "", end_time: "",
  venue_name: "", address: "", city: "台北市",
  entry_fee: "", max_participants: "", format: "",
  registration_url: "", description: "",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("全部");
  const [city, setCity] = useState("全部");
  const [showPast, setShowPast] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let url = `/api/events?upcoming=${!showPast}`;
    if (game !== "全部") url += `&game=${encodeURIComponent(game)}`;
    if (city !== "全部") url += `&city=${encodeURIComponent(city)}`;
    const res = await fetch(url);
    if (res.ok) {
      const { events } = await res.json();
      setEvents(events ?? []);
    }
    setLoading(false);
  }, [game, city, showPast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = events.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.venue_name.toLowerCase().includes(search.toLowerCase())
  );

  async function submitEvent(ev: React.FormEvent) {
    ev.preventDefault();
    if (!user) { alert("請先登入"); return; }
    setSubmitting(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowSubmit(false);
      setForm(defaultForm);
      alert("✅ 賽事已送出，等待審核後將顯示於列表。如為管理員則直接上線。");
      fetchEvents();
    } else {
      const { error } = await res.json();
      alert(error ?? "送出失敗");
    }
    setSubmitting(false);
  }

  function formatDate(date: string) {
    const d = new Date(date);
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${weekdays[d.getDay()]})`;
  }

  function isToday(date: string) {
    return new Date(date).toDateString() === new Date().toDateString();
  }

  function isThisWeek(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  // 依日期分組
  const grouped: Record<string, Event[]> = {};
  for (const e of filtered) {
    if (!grouped[e.start_date]) grouped[e.start_date] = [];
    grouped[e.start_date].push(e);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-brand-400" /> 賽事查詢
          </h1>
          <p className="text-gray-400 text-sm mt-1">查詢台灣各地卡牌賽事，包含寶可夢官方賽事與社群舉辦活動</p>
        </div>
        <button onClick={() => user ? setShowSubmit(true) : window.location.href = "/auth/login"}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus className="w-4 h-4" /> 新增賽事
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{filtered.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">搜尋結果</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{filtered.filter(e => e.source === "official_pokemon").length}</div>
          <div className="text-xs text-gray-500 mt-0.5">官方寶可夢賽</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-brand-400">{new Set(filtered.map(e => e.city)).size}</div>
          <div className="text-xs text-gray-500 mt-0.5">涵蓋城市</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋賽事名稱或場地..."
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">🃏 遊戲種類</p>
          <div className="flex gap-2 flex-wrap">
            {gameOptions.map(g => (
              <button key={g} onClick={() => setGame(g)}
                className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  game === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                )}>
                {gameEmoji[g] ?? ""} {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">📍 城市</p>
          <div className="flex gap-2 flex-wrap">
            {cities.map(c => (
              <button key={c} onClick={() => setCity(c)}
                className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  city === c ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
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

      {/* Event List */}
      {loading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-28 shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500 space-y-3">
          <Calendar className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-lg">找不到符合條件的賽事</p>
          <p className="text-sm">換個條件試試，或點「新增賽事」回報你知道的活動</p>
          <button onClick={() => setShowSubmit(true)} className="btn-primary text-sm mt-2">+ 新增賽事</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              {/* 日期標題 */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("px-3 py-1 rounded-full text-sm font-bold",
                  isToday(date) ? "bg-brand-600 text-white" : isThisWeek(date) ? "bg-green-900/50 text-green-300" : "bg-white/5 text-gray-400"
                )}>
                  {isToday(date) ? "🔴 今天" : isThisWeek(date) ? "🟢 本週" : ""} {formatDate(date)}
                </div>
                <span className="text-xs text-gray-600">{dayEvents.length} 場</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* 該日賽事卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayEvents.map(event => {
                  const expanded = expandedId === event.id;
                  const typeInfo = eventTypeLabel[event.event_type] ?? { label: event.event_type, color: "text-gray-400 bg-gray-800" };
                  return (
                    <div key={event.id} className="glass rounded-2xl overflow-hidden card-hover">
                      {/* Color bar */}
                      <div className={cn("h-1.5",
                        event.source === "official_pokemon" ? "bg-yellow-500" :
                        event.event_type === "community" ? "bg-brand-500" : "bg-purple-500"
                      )} />

                      <div className="p-4 space-y-3">
                        {/* Badge row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge text-xs bg-white/5 text-gray-300 font-semibold">
                            {gameEmoji[event.game] ?? "🃏"} {event.game}
                          </span>
                          <span className={`badge text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                          {event.source === "official_pokemon" && (
                            <span className="badge text-xs text-yellow-400 bg-yellow-900/30">官方同步</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-white text-base leading-snug line-clamp-2">{event.title}</h3>

                        {/* Info */}
                        <div className="space-y-1.5 text-sm text-gray-400">
                          {(event.start_time || event.end_time) && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 shrink-0 text-gray-600" />
                              <span className="text-xs">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 shrink-0 text-gray-600" />
                            <span className="text-xs">{event.venue_name}・{event.city}</span>
                          </div>
                          {event.address && (
                            <div className="flex items-start gap-2">
                              <span className="w-4 shrink-0" />
                              <span className="text-xs text-gray-600">{event.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs">
                            {event.entry_fee !== null && (
                              <span className="flex items-center gap-1">💰 報名費：{event.entry_fee === 0 ? "免費" : `NT$${event.entry_fee}`}</span>
                            )}
                            {event.max_participants && (
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.max_participants} 人</span>
                            )}
                          </div>
                        </div>

                        {/* Expand / collapse description */}
                        {event.description && (
                          <div>
                            <button onClick={() => setExpandedId(expanded ? null : event.id)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
                              {expanded ? "收起" : "更多資訊"}
                            </button>
                            {expanded && (
                              <p className="mt-2 text-xs text-gray-400 leading-relaxed">{event.description}</p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          {event.address && (
                            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name + " " + event.address)}`, "_blank")}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-xs font-medium transition-colors border border-brand-700/30">
                              <MapPin className="w-3.5 h-3.5" /> 地圖
                            </button>
                          )}
                          {event.registration_url && (
                            <a href={event.registration_url} target="_blank" rel="noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 text-xs font-medium transition-colors border border-green-700/30">
                              <ExternalLink className="w-3.5 h-3.5" /> 報名頁面
                            </a>
                          )}
                        </div>

                        {/* Submitted by */}
                        {event.source === "community" && event.profiles && (
                          <p className="text-[10px] text-gray-600">由 {event.profiles.display_name ?? event.profiles.username} 回報</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-400" /> 新增賽事
              </h2>
              <button onClick={() => setShowSubmit(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500">提交後由管理員審核，管理員帳號直接上線。</p>

            <form onSubmit={submitEvent} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">賽事名稱 *</label>
                <input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} required
                  placeholder="例：寶可夢卡牌日、MTG FNM..."
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
                <input value={form.venue_name} onChange={e => setForm(v => ({ ...v, venue_name: e.target.value }))} required
                  placeholder="例：XX 卡牌店、XX 社區中心"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">地址</label>
                  <input value={form.address} onChange={e => setForm(v => ({ ...v, address: e.target.value }))}
                    placeholder="詳細地址"
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
                  <input type="number" value={form.entry_fee} onChange={e => setForm(v => ({ ...v, entry_fee: e.target.value }))}
                    placeholder="0 = 免費"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">人數上限</label>
                  <input type="number" value={form.max_participants} onChange={e => setForm(v => ({ ...v, max_participants: e.target.value }))}
                    placeholder="不限則留空"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">報名連結</label>
                <input type="url" value={form.registration_url} onChange={e => setForm(v => ({ ...v, registration_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">賽事說明</label>
                <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={3}
                  placeholder="賽制、規則、注意事項..."
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

      {/* Bottom tip */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 text-sm text-gray-500">
        <span className="text-lg shrink-0">⚡</span>
        <div>
          <p className="text-gray-300 font-medium mb-0.5">寶可夢官方賽事資料來源</p>
          <p>官方賽事每日自動從
            <a href="https://asia.pokemon-card.com/tw/event-search/list/" target="_blank" rel="noreferrer"
              className="text-brand-400 hover:text-brand-300 mx-1">寶可夢卡牌官網</a>
            同步。其他賽事歡迎社群回報，由管理員審核後顯示。
          </p>
        </div>
      </div>
    </div>
  );
}
