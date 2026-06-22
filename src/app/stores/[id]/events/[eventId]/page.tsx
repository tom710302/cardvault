"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, ExternalLink, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useScrollLock } from "@/hooks/useScrollLock";

interface StoreEvent {
  id: string; title: string; description: string | null;
  event_date: string | null; end_date: string | null;
  image_url: string | null; image_urls: string[] | null;
  location: string | null; registration_url: string | null;
  registration_info: string | null; is_active: boolean;
  store_id: string;
}

interface Store {
  id: string; name: string; image_url: string | null;
}

export default function EventDetailPage({ params }: { params: { id: string; eventId: string } }) {
  const [event, setEvent] = useState<StoreEvent | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);
  useScrollLock(lightbox !== null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: st }] = await Promise.all([
        supabase.from("store_events").select("*").eq("id", params.eventId).single(),
        supabase.from("stores").select("id, name, image_url").eq("id", params.id).single(),
      ]);
      setEvent(ev);
      setStore(st);
      setLoading(false);
    }
    load();
  }, [params.eventId, params.id]);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-32 shimmer" />)}
    </div>
  );

  if (!event) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500 space-y-3">
      <Calendar className="w-12 h-12 mx-auto opacity-30" />
      <p>找不到此活動</p>
      <Link href={`/stores/${params.id}`} className="btn-secondary text-sm inline-flex">← 返回店舖</Link>
    </div>
  );

  // 整合所有圖片（舊的 image_url + 新的 image_urls[]）
  const allImages = [
    ...(event.image_url ? [event.image_url] : []),
    ...(event.image_urls ?? []),
  ].filter(Boolean);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-8 h-8" /></button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setLightbox(l => l !== null && l > 0 ? l - 1 : allImages.length - 1); }}>
            <ChevronLeft className="w-10 h-10" />
          </button>
          <img src={allImages[lightbox]} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setLightbox(l => l !== null && l < allImages.length - 1 ? l + 1 : 0); }}>
            <ChevronRight className="w-10 h-10" />
          </button>
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {allImages.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === lightbox ? "bg-white" : "bg-white/40"}`} />)}
            </div>
          )}
        </div>
      )}

      {/* Back */}
      <Link href={`/stores/${params.id}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {store?.name ?? "返回店舖"}
      </Link>

      {/* Hero Image */}
      {allImages.length > 0 && (
        <div className={`grid gap-2 ${allImages.length === 1 ? "grid-cols-1" : allImages.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
          {allImages.slice(0, allImages.length === 1 ? 1 : allImages.length <= 4 ? allImages.length : 4).map((url, i) => (
            <div key={i}
              className={`relative overflow-hidden rounded-2xl cursor-pointer group ${allImages.length >= 3 && i === 0 ? "col-span-2" : ""}`}
              style={{ aspectRatio: allImages.length === 1 ? "16/9" : allImages.length >= 3 && i === 0 ? "16/6" : "1/1" }}
              onClick={() => setLightbox(i)}>
              <img src={url} alt={`活動圖片 ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {allImages.length > 4 && i === 3 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{allImages.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Event Info */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          {store && (
            <Link href={`/stores/${params.id}`} className="text-sm text-brand-400 hover:text-brand-300 mt-1 inline-flex items-center gap-1 transition-colors">
              🏪 {store.name}
            </Link>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {event.event_date && (
            <div className="glass rounded-xl p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">活動日期</p>
                <p className="text-sm font-medium text-gray-200">{formatDate(event.event_date)}</p>
                {event.end_date && event.end_date !== event.event_date && (
                  <p className="text-xs text-gray-400 mt-0.5">至 {formatDate(event.end_date)}</p>
                )}
              </div>
            </div>
          )}
          {event.location && (
            <div className="glass rounded-xl p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">活動地點</p>
                <p className="text-sm font-medium text-gray-200">{event.location}</p>
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location!)}`, "_blank")}
                  className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-flex items-center gap-1">
                  查看地圖 <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="glass rounded-2xl p-5 space-y-2">
            <h2 className="font-semibold text-white flex items-center gap-2">📋 活動說明</h2>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Registration */}
        {(event.registration_info || event.registration_url) && (
          <div className="glass rounded-2xl p-5 space-y-3 border border-brand-700/30" style={{ background: "rgba(92,106,255,0.05)" }}>
            <h2 className="font-semibold text-white flex items-center gap-2">📝 報名方式</h2>
            {event.registration_info && (
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{event.registration_info}</p>
            )}
            {event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noreferrer"
                className="btn-primary inline-flex items-center gap-2 text-sm">
                立即報名 <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* All Images Grid */}
        {allImages.length > 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-white">🖼️ 活動圖片</h2>
            <div className="grid grid-cols-3 gap-2">
              {allImages.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer group" onClick={() => setLightbox(i)}>
                  <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
