"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, BarChart3, Package, TrendingUp, Star, Grid3X3, List, Trash2, X, Eye, EyeOff } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface CollectionItem {
  id: string; card_id: string; condition: string; quantity: number; notes: string | null;
  image_url: string | null; visibility: string; created_at: string;
  cards: { id: string; name: string; name_en: string | null; game: string; set_name: string | null; rarity: string | null; image_url: string | null } | null;
}

interface Card { id: string; name: string; name_en: string | null; game: string; set_name: string | null; rarity: string | null; }

export default function CollectionPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [addForm, setAddForm] = useState({ card_id: "", condition: "NM", quantity: 1, notes: "", image_url: "", visibility: "public" });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchCollection();
      else setLoading(false);
    });
  }, []);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/collections");
    if (res.ok) { const { collections } = await res.json(); setItems(collections ?? []); }
    setLoading(false);
  }, []);

  async function searchCards(q: string) {
    setCardSearch(q);
    if (q.length < 1) { setCards([]); return; }
    const res = await fetch(`/api/cards?search=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) { const { cards } = await res.json(); setCards(cards ?? []); }
  }

  async function addToCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.card_id) { alert("請選擇卡牌"); return; }
    setSubmitting(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ card_id: "", condition: "NM", quantity: 1, notes: "", image_url: "", visibility: "public" });
      setCardSearch(""); setCards([]);
      fetchCollection();
    } else {
      const { error } = await res.json();
      alert(error ?? "新增失敗");
    }
    setSubmitting(false);
  }

  async function removeFromCollection(id: string) {
    if (!confirm("確定移除？")) return;
    await fetch("/api/collections", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchCollection();
  }

  const filtered = items.filter(item =>
    item.cards?.name.includes(search) || item.cards?.game.includes(search)
  );

  const totalCards = items.reduce((s, i) => s + i.quantity, 0);

  if (!user && !loading) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
      <Package className="w-16 h-16 mx-auto text-gray-600" />
      <h2 className="text-xl font-bold text-white">請先登入</h2>
      <p className="text-gray-400 text-sm">登入後才能管理你的收藏庫</p>
      <Link href="/auth/login" className="btn-primary inline-flex">登入 / 註冊</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">新增卡牌到收藏庫</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addToCollection} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">搜尋卡牌</label>
                <input value={cardSearch} onChange={e => searchCards(e.target.value)}
                  placeholder="輸入卡牌名稱..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
                {cardSearch.length > 0 && cards.length === 0 && !addForm.card_id && (
                  <p className="mt-1 text-xs text-gray-500 px-1">找不到符合的卡牌，請試試其他關鍵字</p>
                )}
                {cards.length > 0 && (
                  <div className="mt-1 glass rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {cards.map(card => (
                      <button key={card.id} type="button"
                        onClick={() => { setAddForm(v => ({ ...v, card_id: card.id })); setCardSearch(card.name); setCards([]); }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors",
                          addForm.card_id === card.id ? "bg-brand-600/20 text-brand-300" : "text-gray-200"
                        )}>
                        {card.name} <span className="text-gray-500 text-xs">· {card.game}</span>
                      </button>
                    ))}
                  </div>
                )}
                {addForm.card_id && (
                  <p className="mt-1 text-xs text-green-400 px-1">✓ 已選擇：{cardSearch}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">品相</label>
                  <select value={addForm.condition} onChange={e => setAddForm(v => ({ ...v, condition: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {["M", "NM", "LP", "MP", "HP", "D", "PSA 10", "PSA 9", "BGS 9.5", "BGS 9"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">數量</label>
                  <input type="number" min={1} max={99} value={addForm.quantity}
                    onChange={e => setAddForm(v => ({ ...v, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
                <input value={addForm.notes} onChange={e => setAddForm(v => ({ ...v, notes: e.target.value }))}
                  placeholder="入手方式、心得..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              {/* 卡牌圖片上傳 */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">上傳卡牌照片（選填）</label>
                <ImageUpload
                  folder="collections"
                  label="上傳你的卡牌實體照片"
                  hint="JPG、PNG，最大 5MB"
                  currentUrl={addForm.image_url}
                  className="aspect-[5/3]"
                  onUpload={(url) => setAddForm(v => ({ ...v, image_url: url }))}
                  onRemove={() => setAddForm(v => ({ ...v, image_url: "" }))}
                />
              </div>

              {/* 可見度 */}
              <div className="flex items-center justify-between py-2 border border-white/10 rounded-xl px-3">
                <div className="flex items-center gap-2 text-sm">
                  {addForm.visibility === "public"
                    ? <Eye className="w-4 h-4 text-green-400" />
                    : <EyeOff className="w-4 h-4 text-gray-500" />}
                  <span className="text-gray-300">
                    {addForm.visibility === "public" ? "公開展示" : "僅自己可見"}
                  </span>
                </div>
                <button type="button"
                  onClick={() => setAddForm(v => ({ ...v, visibility: v.visibility === "public" ? "private" : "public" }))}
                  className={cn("text-xs px-3 py-1 rounded-full transition-colors",
                    addForm.visibility === "public"
                      ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  )}>
                  {addForm.visibility === "public" ? "切換為私人" : "切換為公開"}
                </button>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={submitting || !addForm.card_id}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {submitting ? "新增中..." : "新增到收藏"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">我的收藏庫</h1>
          <p className="text-gray-400 text-sm mt-1">管理、追蹤你的所有實體卡牌</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> 新增卡牌
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4"><div className="flex items-center gap-2 mb-2 text-blue-400"><Package className="w-4 h-4" /><span className="text-xs text-gray-500">總收藏數</span></div><div className="text-2xl font-bold text-white">{totalCards} 張</div></div>
        <div className="glass rounded-xl p-4"><div className="flex items-center gap-2 mb-2 text-green-400"><TrendingUp className="w-4 h-4" /><span className="text-xs text-gray-500">種類數</span></div><div className="text-2xl font-bold text-white">{items.length} 種</div></div>
        <div className="glass rounded-xl p-4"><div className="flex items-center gap-2 mb-2 text-yellow-400"><Star className="w-4 h-4" /><span className="text-xs text-gray-500">遊戲種類</span></div><div className="text-2xl font-bold text-white">{new Set(items.map(i => i.cards?.game)).size} 種</div></div>
        <div className="glass rounded-xl p-4"><div className="flex items-center gap-2 mb-2 text-brand-400"><BarChart3 className="w-4 h-4" /><span className="text-xs text-gray-500">已評級</span></div><div className="text-2xl font-bold text-white">{items.filter(i => i.condition.includes("PSA") || i.condition.includes("BGS")).length} 張</div></div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input placeholder="搜尋我的收藏..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("grid")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "grid" ? "bg-brand-600 text-white" : "btn-secondary")}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "list" ? "bg-brand-600 text-white" : "btn-secondary")}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-xl aspect-[5/7] shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 space-y-3">
          <Package className="w-12 h-12 mx-auto opacity-30" />
          <p>{items.length === 0 ? "收藏庫是空的，新增你的第一張卡吧！" : "沒有符合搜尋的卡牌"}</p>
          {items.length === 0 && <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ 新增卡牌</button>}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          <button onClick={() => setShowAdd(true)}
            className="glass rounded-xl border-2 border-dashed border-white/10 hover:border-brand-500/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-brand-400 aspect-[5/7]">
            <Plus className="w-8 h-8" /><span className="text-xs">新增</span>
          </button>
          {filtered.map(item => (
            <div key={item.id} className="glass rounded-xl overflow-hidden card-hover group relative">
              {/* 點擊跳到卡牌詳情 */}
              <Link href={`/cards/${item.card_id}`} className="block">
                <div className="aspect-[5/7] bg-gray-800 flex items-center justify-center text-5xl relative overflow-hidden">
                  {item.image_url || item.cards?.image_url ? (
                    <img
                      src={item.image_url ?? item.cards?.image_url ?? ""}
                      alt={item.cards?.name ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>🃏</span>
                  )}
                  {item.quantity > 1 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{item.quantity}</span>
                  )}
                </div>
                <div className="p-2.5 space-y-1">
                  <div className="text-xs font-semibold text-white line-clamp-1 group-hover:text-brand-300 transition-colors">{item.cards?.name}</div>
                  <div className="text-[10px] text-gray-500">{item.cards?.game} · {item.condition}</div>
                  {item.notes && <div className="text-[10px] text-gray-600 italic truncate">{item.notes}</div>}
                </div>
              </Link>
              {/* 刪除按鈕 */}
              <button onClick={() => removeFromCollection(item.id)}
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white transition-opacity z-10">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4 group">
              <Link href={`/cards/${item.card_id}`} className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {item.image_url || item.cards?.image_url ? (
                  <img src={item.image_url ?? item.cards?.image_url ?? ""} alt={item.cards?.name ?? ""} className="w-full h-full object-cover" />
                ) : <span>🃏</span>}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/cards/${item.card_id}`} className="font-semibold text-white hover:text-brand-300 transition-colors">{item.cards?.name}</Link>
                <div className="text-xs text-gray-500 mt-0.5">{item.cards?.game} · {item.cards?.set_name} · {item.condition}</div>
                {item.notes && <div className="text-xs text-gray-600 italic mt-1">{item.notes}</div>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-gray-400">x{item.quantity}</span>
                <button onClick={() => removeFromCollection(item.id)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
