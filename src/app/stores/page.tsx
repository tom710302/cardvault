"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Phone, Clock, Globe, Plus, X, CheckCircle, ExternalLink, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface Store {
  id: string; name: string; address: string; city: string;
  phone: string | null; website: string | null; hours: string | null;
  description: string | null; image_url: string | null;
  games: string[]; is_verified: boolean; created_at: string;
}

const cities = ["全部", "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市", "其他"];
const gameOptions = ["全部", "MTG", "寶可夢", "遊戲王", "NBA", "MLB", "NFL", "WS"];
const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", NFL: "🏈", WS: "🎴" };

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("全部");
  const [game, setGame] = useState("全部");
  const [showAdd, setShowAdd] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", city: "台北市", phone: "", website: "",
    hours: "", description: "", image_url: "", games: [] as string[],
  });
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    let url = "/api/stores?";
    if (city !== "全部") url += `city=${encodeURIComponent(city)}&`;
    if (game !== "全部") url += `game=${encodeURIComponent(game)}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    if (res.ok) { const { stores } = await res.json(); setStores(stores ?? []); }
    setLoading(false);
  }, [city, game, search]);

  useEffect(() => {
    const t = setTimeout(fetchStores, 300);
    return () => clearTimeout(t);
  }, [fetchStores]);

  function toggleGame(g: string) {
    setForm(v => ({
      ...v,
      games: v.games.includes(g) ? v.games.filter(x => x !== g) : [...v.games, g],
    }));
  }

  async function submitStore(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/auth/login"; return; }
    setSubmitting(true);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ name: "", address: "", city: "台北市", phone: "", website: "", hours: "", description: "", image_url: "", games: [] });
      fetchStores();
      alert("✅ 店舖已提交！管理員審核後會顯示驗證標記。");
    } else {
      const { error } = await res.json();
      alert(error ?? "提交失敗");
    }
    setSubmitting(false);
  }

  function openGoogleMaps(store: Store) {
    const query = encodeURIComponent(`${store.name} ${store.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  }

  function openNavigation(store: Store) {
    const query = encodeURIComponent(store.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, "_blank");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Add Store Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-400" /> 新增卡牌店
              </h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500">提交後由管理員審核，通過後會顯示驗證標記 ✓</p>
            <form onSubmit={submitStore} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">店舖名稱 *</label>
                <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required
                  placeholder="例如：卡牌王國台北店"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">地址 *</label>
                  <input value={form.address} onChange={e => setForm(v => ({ ...v, address: e.target.value }))} required
                    placeholder="例如：中山區南京東路二段100號"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">城市 *</label>
                  <select value={form.city} onChange={e => setForm(v => ({ ...v, city: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100">
                    {cities.filter(c => c !== "全部").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">電話</label>
                  <input value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))}
                    placeholder="02-xxxx-xxxx"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">網站</label>
                  <input value={form.website} onChange={e => setForm(v => ({ ...v, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">營業時間</label>
                <input value={form.hours} onChange={e => setForm(v => ({ ...v, hours: e.target.value }))}
                  placeholder="例如：週一至週日 11:00-21:00"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">販售卡牌種類</label>
                <div className="flex flex-wrap gap-2">
                  {gameOptions.filter(g => g !== "全部").map(g => (
                    <button key={g} type="button" onClick={() => toggleGame(g)}
                      className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        form.games.includes(g) ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      )}>
                      {gameEmoji[g] ?? ""} {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">店舖簡介（選填）</label>
                <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={2}
                  placeholder="介紹店舖特色、服務..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">店舖照片（選填）</label>
                <ImageUpload folder="stores" label="上傳店舖照片" hint="JPG、PNG，最大 5MB"
                  currentUrl={form.image_url} className="aspect-video"
                  onUpload={url => setForm(v => ({ ...v, image_url: url }))}
                  onRemove={() => setForm(v => ({ ...v, image_url: "" }))} />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={submitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> {submitting ? "提交中..." : "提交店舖"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-7 h-7 text-brand-400" /> 店舖查詢
          </h1>
          <p className="text-gray-400 text-sm mt-1">尋找你附近的卡牌店，點擊地址直接開啟 Google Maps 導航</p>
        </div>
        <button onClick={() => user ? setShowAdd(true) : window.location.href = "/auth/login"}
          className="btn-primary flex items-center gap-2 shrink-0 text-sm">
          <Plus className="w-4 h-4" /> 新增店舖
        </button>
      </div>

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
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋店舖名稱..."
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
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
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">🃏 卡牌種類</p>
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
      </div>

      {/* Store List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-48 shimmer" />)}
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 text-gray-500 space-y-3">
          <MapPin className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-lg">找不到符合條件的店舖</p>
          <p className="text-sm">換個城市或卡牌種類試試，或新增你知道的店舖！</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ 新增店舖</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map(store => (
            <div key={store.id} className="glass rounded-2xl overflow-hidden card-hover group">
              {/* Store Image */}
              <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                {store.image_url ? (
                  <img src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <MapPin className="w-10 h-10 text-gray-600 mx-auto" />
                      <p className="text-xs text-gray-600">{store.city}</p>
                    </div>
                  </div>
                )}
                {store.is_verified && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-green-900/80 text-green-400 text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                    <CheckCircle className="w-3 h-3" /> 已驗證
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {store.city}
                </div>
              </div>

              {/* Store Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{store.name}</h3>
                  {store.description && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{store.description}</p>
                  )}
                </div>

                {/* Games */}
                {store.games.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {store.games.map(g => (
                      <span key={g} className="badge text-xs bg-brand-900/30 text-brand-300 border border-brand-700/30">
                        {gameEmoji[g] ?? ""} {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Details */}
                <div className="space-y-1.5 text-sm text-gray-400">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-600" />
                    <span className="text-xs leading-relaxed">{store.address}</span>
                  </div>
                  {store.hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0 text-gray-600" />
                      <span className="text-xs">{store.hours}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0 text-gray-600" />
                      <a href={`tel:${store.phone}`} className="text-xs hover:text-brand-400 transition-colors">{store.phone}</a>
                    </div>
                  )}
                  {store.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 shrink-0 text-gray-600" />
                      <a href={store.website} target="_blank" rel="noreferrer"
                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors truncate">
                        {store.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openGoogleMaps(store)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-sm font-medium transition-colors border border-brand-700/30">
                    <MapPin className="w-4 h-4" /> 查看地圖
                  </button>
                  <button onClick={() => openNavigation(store)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/30 text-green-400 text-sm font-medium transition-colors border border-green-700/30">
                    <Navigation className="w-4 h-4" /> 導航前往
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom tip */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 text-sm text-gray-500">
        <span className="text-lg shrink-0">💡</span>
        <div>
          <p className="text-gray-300 font-medium mb-0.5">知道附近有卡牌店嗎？</p>
          <p>點「新增店舖」提交資訊，幫助更多收藏家找到好店！管理員審核後會顯示官方驗證標記。</p>
        </div>
      </div>
    </div>
  );
}
