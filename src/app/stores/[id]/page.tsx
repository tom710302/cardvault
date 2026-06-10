"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Clock, Globe, Navigation, CheckCircle, Calendar, Package, MessageSquare, ExternalLink } from "lucide-react";

interface Store {
  id: string; name: string; address: string; city: string;
  phone: string | null; website: string | null; hours: string | null;
  description: string | null; intro: string | null; image_url: string | null;
  games: string[]; products: string[]; is_verified: boolean;
}

interface StoreEvent {
  id: string; title: string; description: string | null;
  event_date: string | null; image_url: string | null; is_active: boolean;
}
interface StoreProduct {
  id: string; name: string; description: string | null; price: number | null;
  stock: number; image_url: string | null; category: string | null;
}

const gameEmoji: Record<string, string> = {
  MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", NFL: "🏈", WS: "🎴",
};

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  const [store, setStore] = useState<Store | null>(null);
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"about" | "products" | "events" | "contact">("about");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/stores/${params.id}`);
      if (res.ok) {
        const { store, events, products } = await res.json();
        setStore(store);
        setEvents(events);
        setProducts(products);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  function openGoogleMaps() {
    if (!store) return;
    const q = encodeURIComponent(`${store.name} ${store.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  }

  function openNavigation() {
    if (!store) return;
    const q = encodeURIComponent(store.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank");
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-32 shimmer" />)}
    </div>
  );

  if (!store) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500 space-y-3">
      <MapPin className="w-12 h-12 mx-auto opacity-30" />
      <p className="text-lg">找不到此店舖</p>
      <Link href="/stores" className="btn-secondary text-sm inline-flex">← 返回店舖列表</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/stores" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回店舖列表
      </Link>

      {/* Hero */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Cover Image */}
        <div className="h-56 md:h-72 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
          {store.image_url ? (
            <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-20 h-20 text-gray-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {store.is_verified && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-green-900/80 text-green-400 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
              <CheckCircle className="w-4 h-4" /> 官方驗證店舖
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-3xl font-bold text-white">{store.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-gray-300 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{store.city} · {store.address}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 flex gap-3 border-b border-white/10">
          <button onClick={openGoogleMaps}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-sm font-medium transition-colors border border-brand-700/30">
            <MapPin className="w-4 h-4" /> 查看地圖
          </button>
          <button onClick={openNavigation}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 text-sm font-medium transition-colors border border-green-700/30">
            <Navigation className="w-4 h-4" /> 導航前往
          </button>
          {store.phone && (
            <a href={`tel:${store.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors border border-white/10">
              <Phone className="w-4 h-4" /> 撥打電話
            </a>
          )}
        </div>

      </div>

      {/* Games Tags + 分類展開 */}
      {store.games?.length > 0 && (
        <div className="space-y-3">
          {/* 遊戲按鈕列 */}
          <div className="flex flex-wrap gap-2">
            {store.games.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  const next = selectedGame === g ? null : g;
                  setSelectedGame(next);
                  setSelectedCategory(null);
                  if (next) setTab("products");
                }}
                className={[
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                  selectedGame === g
                    ? "bg-brand-600 text-white border-brand-500"
                    : "bg-brand-900/30 text-brand-300 border-brand-700/30 hover:bg-brand-600/30"
                ].join(" ")}
              >
                {gameEmoji[g] ?? "🃏"} {g}
                <span className="text-xs opacity-60">{selectedGame === g ? "▴" : "▾"}</span>
              </button>
            ))}
          </div>

          {/* 分類展開列 */}
          {selectedGame && (
            <div className="glass rounded-xl p-3 border border-brand-700/30">
              <p className="text-xs text-gray-500 mb-2">
                {gameEmoji[selectedGame]} {selectedGame} · 選擇分類
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { cat: null, label: "🃏 全部", },
                  { cat: "盒裝", label: "📦 盒裝" },
                  { cat: "卡包", label: "🎴 卡包" },
                  { cat: "卡套", label: "🛡️ 卡套" },
                  { cat: "週邊商品", label: "⭐ 週邊商品" },
                  { cat: "單卡", label: "✨ 單卡" },
                  { cat: "其他", label: "📋 其他" },
                ].map(({ cat, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={[
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                      selectedCategory === cat
                        ? "bg-brand-600 text-white border-brand-500"
                        : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1 overflow-x-auto">
          {([
            ["about", "📋 店舖簡介"],
            ["products", "🃏 販售商品"],
            ["events", `📅 活動資訊${events.length > 0 ? ` (${events.length})` : ""}`],
            ["contact", "📞 聯絡方式"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "about" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📋 關於 {store.name}
          </h2>
          {store.intro || store.description ? (
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {store.intro || store.description}
            </p>
          ) : (
            <p className="text-gray-500 text-sm">店舖尚未填寫簡介。</p>
          )}

          {/* Basic Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {store.hours && (
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <Clock className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">營業時間</p>
                  <p className="text-sm text-gray-200">{store.hours}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
              <MapPin className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">地址</p>
                <p className="text-sm text-gray-200">{store.city} {store.address}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-400" /> 販售商品
          </h2>

          {/* Game Types */}
          {store.games?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">卡牌遊戲種類</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {store.games.map(g => (
                  <div key={g} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-2xl">{gameEmoji[g] ?? "🃏"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{g}</p>
                      <p className="text-xs text-gray-500">有販售</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {store.products?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">其他商品</h3>
              <div className="flex flex-wrap gap-2">
                {store.products.map((p, i) => (
                  <span key={i} className="badge text-sm bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Real Products from store_products table */}
          {products.length > 0 && (() => {
            const filtered = products.filter(p => {
              // game 未設定的商品（舊資料）也納入顯示
              const matchGame = !selectedGame || (p as any).game === selectedGame || !(p as any).game;
              const matchCat = !selectedCategory || p.category === selectedCategory;
              return matchGame && matchCat;
            });
            return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">
                  現售商品與庫存
                  {(selectedGame || selectedCategory) && (
                    <span className="ml-2 text-brand-400">（{filtered.length} 件）</span>
                  )}
                </h3>
                {(selectedGame || selectedCategory) && (
                  <button onClick={() => { setSelectedGame(null); setSelectedCategory(null); }} className="text-xs text-gray-500 hover:text-gray-300">清除篩選</button>
                )}
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">此分類目前沒有商品</div>
              ) : (
              <div className="space-y-2">
                {filtered.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-xl shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-200">{p.name}</span>
                        {p.category && <span className="badge text-xs bg-gray-800 text-gray-400">{p.category}</span>}
                      </div>
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {p.price && <p className="text-sm font-bold text-brand-400">NT${p.price.toLocaleString()}</p>}
                      <p className={`text-xs font-medium mt-0.5 ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-yellow-400" : "text-green-400"}`}>
                        {p.stock === 0 ? "已售完" : p.stock <= 5 ? `剩 ${p.stock} 件` : `庫存 ${p.stock}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>)}
            </div>
          );})()}

          {!store.games?.length && !store.products?.length && products.length === 0 && (
            <p className="text-gray-500 text-sm">尚未填寫商品資訊。</p>
          )}
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-400" /> 活動資訊
          </h2>
          {events.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-gray-500 space-y-2">
              <Calendar className="w-10 h-10 mx-auto opacity-30" />
              <p>目前沒有進行中的活動</p>
              <p className="text-xs">請關注店舖社群獲取最新活動資訊</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map(event => (
                <div key={event.id} className="glass rounded-2xl overflow-hidden">
                  {event.image_url && (
                    <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-5 space-y-2">
                    {event.event_date && (
                      <div className="flex items-center gap-1.5 text-xs text-brand-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.event_date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white">{event.title}</h3>
                    {event.description && (
                      <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "contact" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-400" /> 聯絡方式
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <MapPin className="w-5 h-5 text-brand-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">店舖地址</p>
                <p className="text-sm text-gray-200">{store.city} {store.address}</p>
              </div>
              <button onClick={openGoogleMaps} className="text-brand-400 hover:text-brand-300 text-xs shrink-0">
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {store.phone && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <Phone className="w-5 h-5 text-green-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">聯絡電話</p>
                  <a href={`tel:${store.phone}`} className="text-sm text-gray-200 hover:text-brand-300 transition-colors">{store.phone}</a>
                </div>
              </div>
            )}

            {store.hours && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">營業時間</p>
                  <p className="text-sm text-gray-200">{store.hours}</p>
                </div>
              </div>
            )}

            {store.website && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <Globe className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">官方網站</p>
                  <a href={store.website} target="_blank" rel="noreferrer"
                    className="text-sm text-brand-400 hover:text-brand-300 transition-colors truncate block">
                    {store.website}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Map CTA */}
          <div className="flex gap-3 pt-2">
            <button onClick={openGoogleMaps}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 font-medium transition-colors border border-brand-700/30">
              <MapPin className="w-4 h-4" /> 在 Google Maps 查看
            </button>
            <button onClick={openNavigation}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 font-medium transition-colors border border-green-700/30">
              <Navigation className="w-4 h-4" /> 開始導航
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
