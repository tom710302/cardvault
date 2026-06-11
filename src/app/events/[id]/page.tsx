"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, MapPin, Clock, Users, ExternalLink, Navigation, ArrowLeft, Phone, Tag, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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
  source_id: string | null;
  status: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
}

const gameEmoji: Record<string, string> = {
  寶可夢: "⚡", MTG: "⚔️", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", 其他: "🃏",
};

const eventTypeLabel: Record<string, { label: string; color: string }> = {
  official: { label: "官方賽事", color: "text-yellow-400 bg-yellow-900/30 border-yellow-700/30" },
  community: { label: "社群賽事", color: "text-blue-400 bg-blue-900/30 border-blue-700/30" },
  store: { label: "店家賽事", color: "text-purple-400 bg-purple-900/30 border-purple-700/30" },
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ event }) => setEvent(event))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  function formatDate(date: string) {
    const d = new Date(date);
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（${weekdays[d.getDay()]}）`;
  }

  function openMap() {
    if (!event) return;
    const q = encodeURIComponent(`${event.venue_name} ${event.address ?? event.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  }

  function openNav() {
    if (!event) return;
    const q = encodeURIComponent(event.address ?? `${event.venue_name} ${event.city}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank");
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
      <div className="glass rounded-2xl h-64 shimmer" />
      <div className="glass rounded-2xl h-40 shimmer" />
    </div>
  );

  if (notFound || !event) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
      <Calendar className="w-12 h-12 mx-auto text-gray-600" />
      <p className="text-gray-400">找不到此賽事</p>
      <button onClick={() => router.push("/events")} className="btn-secondary text-sm">← 回到賽事列表</button>
    </div>
  );

  const typeInfo = eventTypeLabel[event.event_type] ?? { label: event.event_type, color: "text-gray-400 bg-gray-800 border-gray-700" };
  const isOfficial = event.source === "official_pokemon";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Back */}
      <button onClick={() => router.push("/events")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 回到賽事列表
      </button>

      {/* Main Card */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Color bar */}
        <div className={cn("h-2", isOfficial ? "bg-gradient-to-r from-yellow-500 to-orange-500" : event.event_type === "community" ? "bg-gradient-to-r from-brand-500 to-purple-500" : "bg-gradient-to-r from-purple-500 to-pink-500")} />

        <div className="p-6 space-y-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge text-sm font-semibold bg-white/5 text-gray-200 px-3 py-1">
              {gameEmoji[event.game] ?? "🃏"} {event.game}
            </span>
            <span className={`badge text-xs px-3 py-1 border ${typeInfo.color}`}>{typeInfo.label}</span>
            {isOfficial && (
              <span className="badge text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700/30 px-3 py-1">
                ⚡ 官方同步資料
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white leading-snug">{event.title}</h1>

          {/* Date & Time */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-gray-300">
              <Calendar className="w-5 h-5 text-brand-400 shrink-0" />
              <span className="text-base">{formatDate(event.start_date)}</span>
              {event.end_date && event.end_date !== event.start_date && (
                <span className="text-gray-500">～ {formatDate(event.end_date)}</span>
              )}
            </div>
            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-3 text-gray-300">
                <Clock className="w-5 h-5 text-brand-400 shrink-0" />
                <span className="text-base">
                  {event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}
                </span>
              </div>
            )}
          </div>

          <hr className="border-white/10" />

          {/* Venue */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">活動場地</h2>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-base">{event.venue_name}</p>
                <p className="text-gray-400 text-sm mt-0.5">{event.city}</p>
                {event.address && (
                  <p className="text-gray-500 text-sm mt-0.5">{event.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {event.entry_fee !== null && (
              <div className="glass rounded-xl p-3 space-y-0.5">
                <p className="text-xs text-gray-500">報名費用</p>
                <p className="text-white font-bold text-lg">
                  {event.entry_fee === 0 ? "免費" : `NT$ ${event.entry_fee}`}
                </p>
              </div>
            )}
            {event.max_participants && (
              <div className="glass rounded-xl p-3 space-y-0.5">
                <p className="text-xs text-gray-500">人數上限</p>
                <p className="text-white font-bold text-lg flex items-center gap-1">
                  <Users className="w-4 h-4 text-brand-400" /> {event.max_participants} 人
                </p>
              </div>
            )}
            {event.format && (
              <div className="glass rounded-xl p-3 space-y-0.5">
                <p className="text-xs text-gray-500">賽制</p>
                <p className="text-white font-semibold">{event.format}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> 賽事說明
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3 pt-1">
            {event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors">
                <ExternalLink className="w-4 h-4" />
                {isOfficial ? "前往官網報名頁面" : "前往報名頁面"}
              </a>
            )}
            {(event.address || event.venue_name) && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={openMap}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 font-medium transition-colors border border-brand-700/30">
                  <MapPin className="w-4 h-4" /> 查看地圖
                </button>
                <button onClick={openNav}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 font-medium transition-colors border border-green-700/30">
                  <Navigation className="w-4 h-4" /> 導航前往
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submitter info */}
      {event.source === "community" && event.profiles && (
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Tag className="w-3.5 h-3.5" />
          由 <span className="text-gray-300">{event.profiles.display_name ?? event.profiles.username}</span> 回報
        </div>
      )}
      {isOfficial && (
        <div className="glass rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          此賽事資料自動同步自寶可夢卡牌官網，詳細資訊請以官網為準。
        </div>
      )}
    </div>
  );
}
