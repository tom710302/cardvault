"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Plus, Trash2, Search, X, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WishItem {
  id: string; card_id: string; max_price: number | null; notes: string | null; created_at: string;
  cards: { id: string; name: string; game: string; rarity: string | null; set_name: string | null } | null;
}

const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [form, setForm] = useState({ card_id: "", max_price: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchWishlist();
      else setLoading(false);
    });
  }, []);

  async function fetchWishlist() {
    setLoading(true);
    const res = await fetch("/api/wishlist");
    if (res.ok) { const { wishlist } = await res.json(); setItems(wishlist ?? []); }
    setLoading(false);
  }

  async function searchCards(q: string) {
    setCardSearch(q);
    if (!q) { setCards([]); return; }
    const res = await fetch(`/api/cards?search=${encodeURIComponent(q)}&limit=8`);
    if (res.ok) { const { cards } = await res.json(); setCards(cards ?? []); }
  }

  async function addToWishlist(e: React.FormEvent) {
    e.preventDefault();
    if (!form.card_id) { toast.error("請選擇卡牌"); return; }
    setSubmitting(true);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: form.card_id, max_price: form.max_price ? parseInt(form.max_price) : null, notes: form.notes || null }),
    });
    if (res.ok) { setShowAdd(false); setForm({ card_id: "", max_price: "", notes: "" }); setCardSearch(""); setCards([]); fetchWishlist(); }
    setSubmitting(false);
  }

  async function removeFromWishlist(cardId: string) {
    await fetch("/api/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId }) });
    fetchWishlist();
  }

  if (!user && !loading) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
      <h2 className="text-xl font-bold text-white">請先登入</h2>
      <Link href="/auth/login" className="btn-primary inline-flex">登入 / 註冊</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">新增到想求清單</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={addToWishlist} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">搜尋卡牌</label>
                <input value={cardSearch} onChange={e => searchCards(e.target.value)} placeholder="輸入卡牌名稱..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                {cards.length > 0 && (
                  <div className="mt-1 glass rounded-lg max-h-40 overflow-y-auto">
                    {cards.map(card => (
                      <button key={card.id} type="button"
                        onClick={() => { setForm(v => ({ ...v, card_id: card.id })); setCardSearch(card.name); setCards([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-gray-200">
                        {gameEmoji[card.game] ?? "🃏"} {card.name} <span className="text-gray-500 text-xs">· {card.game}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">最高可接受價格（TWD，選填）</label>
                <input type="number" value={form.max_price} onChange={e => setForm(v => ({ ...v, max_price: e.target.value }))}
                  placeholder="例如：50000"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
                <input value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))}
                  placeholder="品相要求、特殊版本..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={submitting || !form.card_id} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {submitting ? "新增中..." : "加入想求"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 mb-2 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-3xl font-bold text-white">想求清單</h1>
          <p className="text-gray-400 text-sm mt-1">追蹤你想要的卡牌，設定目標價格</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 shrink-0 text-sm">
          <Plus className="w-4 h-4" /> 新增想求
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-16 shimmer" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500 space-y-3">
          <Search className="w-12 h-12 mx-auto opacity-30" />
          <p>想求清單是空的</p>
          <p className="text-sm">加入你想要的卡牌，追蹤市場行情</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ 新增想求</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4 group">
              <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">
                {gameEmoji[item.cards?.game ?? ""] ?? "🃏"}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/cards/${item.card_id}`} className="font-semibold text-white hover:text-brand-300 transition-colors">
                  {item.cards?.name}
                </Link>
                <div className="text-xs text-gray-500 mt-0.5">{item.cards?.game} · {item.cards?.set_name} · {item.cards?.rarity}</div>
                {item.notes && <div className="text-xs text-gray-600 italic mt-1">{item.notes}</div>}
              </div>
              <div className="text-right shrink-0 space-y-1">
                {item.max_price && (
                  <div className="text-sm font-bold text-brand-400">上限 {item.max_price.toLocaleString()}</div>
                )}
                <button onClick={() => removeFromWishlist(item.card_id)}
                  className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
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
