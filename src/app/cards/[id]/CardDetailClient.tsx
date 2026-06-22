"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, BookmarkPlus, Share2, TrendingUp, MessageSquare, ExternalLink, X, Edit2, Save } from "lucide-react";
import { formatPrice, timeAgo } from "@/lib/utils";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToast } from "@/components/ui/Toast";
import { useScrollLock } from "@/hooks/useScrollLock";

const PriceChart = dynamic(() => import("@/components/ui/PriceChart").then(m => m.PriceChart), { ssr: false });

const gameEmoji: Record<string, string> = {
  MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾",
};

interface Card {
  id: string; name: string; name_en: string | null; game: string; card_type: string;
  set_name: string | null; set_code: string | null; rarity: string | null;
  image_url: string | null; description: string | null; is_active: boolean;
  created_by: string | null;
}

interface PriceReport {
  id: string; price: number; condition: string; source_url: string | null;
  created_at: string; profiles: { username: string } | null;
}

interface ScryfallPrice {
  usd: string | null; usd_foil: string | null; usd_etched: string | null;
  scryfall_uri: string | null;
}

export default function CardDetailClient({ id }: { id: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "price" | "discussion">("overview");
  const [scryfallPrice, setScryfallPrice] = useState<ScryfallPrice | null>(null);
  const [scryfallLoading, setScryfallLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", name_en: "", game: "", card_type: "", set_name: "", set_code: "", rarity: "", description: "", image_url: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [showPriceReport, setShowPriceReport] = useState(false);
  useScrollLock(showEdit || showPriceReport);
  const [priceForm, setPriceForm] = useState({ price: "", condition: "NM", source_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [inCollection, setInCollection] = useState(false);
  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("role").eq("id", user.id).single()
          .then(({ data }) => setUserProfile(data));
      }
    });
    fetchCard();
  }, [id]);

  useEffect(() => {
    if (activeTab === "price") {
      fetchPriceReports();
      if (card?.game === "MTG") fetchScryfallPrice(card.name_en || card.name);
    }
  }, [activeTab, card]);

  async function fetchCard() {
    const res = await fetch(`/api/cards/${id}`);
    if (res.ok) {
      const { card } = await res.json();
      setCard(card);
      setEditForm({
        name: card.name ?? "", name_en: card.name_en ?? "",
        game: card.game ?? "", card_type: card.card_type ?? "tcg",
        set_name: card.set_name ?? "", set_code: card.set_code ?? "",
        rarity: card.rarity ?? "", description: card.description ?? "",
        image_url: card.image_url ?? "",
      });
    } else {
      const { data } = await supabase.from("cards").select("*").eq("id", id).single();
      setCard(data);
    }
    setLoading(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    const res = await fetch(`/api/cards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const { card } = await res.json();
      setCard(card);
      setShowEdit(false);
      toast.success("卡牌資料已更新！");
    } else {
      const { error } = await res.json();
      toast.error(error ?? "更新失敗");
    }
    setEditSaving(false);
  }

  async function fetchPriceReports() {
    const res = await fetch(`/api/price-reports?card_id=${id}`);
    if (res.ok) { const { reports } = await res.json(); setReports(reports ?? []); }
  }

  async function fetchScryfallPrice(name: string) {
    setScryfallLoading(true);
    const res = await fetch(`/api/cards/scryfall-price?name=${encodeURIComponent(name)}`);
    if (res.ok) setScryfallPrice(await res.json());
    setScryfallLoading(false);
  }

  async function addToCollection() {
    if (!user) { window.location.href = "/auth/login"; return; }
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: id, condition: "NM", quantity: 1 }),
    });
    if (res.ok) {
      window.location.href = "/collection";
    } else {
      const { error } = await res.json();
      toast.error(error ?? "新增失敗");
    }
  }

  async function submitPriceReport(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/auth/login"; return; }
    setSubmitting(true);
    const res = await fetch("/api/price-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: id, price: parseInt(priceForm.price), condition: priceForm.condition, source_url: priceForm.source_url || null }),
    });
    if (res.ok) {
      setShowPriceReport(false);
      setPriceForm({ price: "", condition: "NM", source_url: "" });
      fetchPriceReports();
      toast.success("感謝你的價格回報！");
    }
    setSubmitting(false);
  }

  const avgPrice = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.price, 0) / reports.length) : null;
  const priceHistory = reports.slice(0, 6).reverse().map((r, i) => ({
    date: timeAgo(new Date(r.created_at)),
    price: r.price,
  }));

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-32 shimmer" />)}
    </div>
  );

  if (!card) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
      <p>找不到此卡牌</p>
      <Link href="/cards" className="btn-secondary mt-4 inline-flex text-sm">回到卡牌庫</Link>
    </div>
  );

  const canEdit = user && card && (card.created_by === user.id || userProfile?.role === "admin");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" /> 編輯卡牌資料
              </h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">卡牌名稱 *</label>
                  <input value={editForm.name} onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))} required
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">英文名稱</label>
                  <input value={editForm.name_en} onChange={e => setEditForm(v => ({ ...v, name_en: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">遊戲 *</label>
                  <select value={editForm.game} onChange={e => setEditForm(v => ({ ...v, game: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {["MTG","寶可夢","遊戲王","NBA","MLB","NFL","WS","其他"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">類型</label>
                  <select value={editForm.card_type} onChange={e => setEditForm(v => ({ ...v, card_type: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    <option value="tcg">TCG 集換式</option>
                    <option value="sports">運動球員卡</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">系列名稱</label>
                  <input value={editForm.set_name} onChange={e => setEditForm(v => ({ ...v, set_name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">稀有度</label>
                  <input value={editForm.rarity} onChange={e => setEditForm(v => ({ ...v, rarity: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">描述</label>
                <textarea value={editForm.description} onChange={e => setEditForm(v => ({ ...v, description: e.target.value }))} rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">卡牌圖片</label>
                <ImageUpload
                  folder="cards"
                  label="更換卡牌圖片"
                  hint="JPG、PNG、WebP，最大 5MB"
                  currentUrl={editForm.image_url}
                  className="aspect-[5/3]"
                  onUpload={(url) => setEditForm(v => ({ ...v, image_url: url }))}
                  onRemove={() => setEditForm(v => ({ ...v, image_url: "" }))}
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={editSaving}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {editSaving ? "儲存中..." : "儲存變更"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Report Modal */}
      {showPriceReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">回報成交價格</h2>
              <button onClick={() => setShowPriceReport(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitPriceReport} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">成交價格（TWD）</label>
                <input type="number" value={priceForm.price} onChange={e => setPriceForm(v => ({ ...v, price: e.target.value }))}
                  placeholder="例如：50000" required min={1}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">品相</label>
                <select value={priceForm.condition} onChange={e => setPriceForm(v => ({ ...v, condition: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                  {["M", "NM", "LP", "MP", "HP", "PSA 10", "PSA 9", "PSA 8", "BGS 9.5", "BGS 9"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">來源連結（選填）</label>
                <input type="url" value={priceForm.source_url} onChange={e => setPriceForm(v => ({ ...v, source_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPriceReport(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={submitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {submitting ? "送出中..." : "送出回報"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Link href="/cards" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回卡牌資料庫
      </Link>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="aspect-[5/7] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-[80px] border border-white/10 shadow-2xl">
            {card.image_url ? (
              <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <span>{gameEmoji[card.game] ?? "🃏"}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={addToCollection}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border bg-brand-600/20 text-brand-400 border-brand-500/30 hover:bg-brand-600/30">
              <Heart className="w-4 h-4" /> 收藏
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("連結已複製！"); }}
              className="px-3 py-2.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {card.rarity && <span className="badge text-xs text-purple-400 bg-purple-900/30">{card.rarity}</span>}
              <span className="badge text-xs bg-gray-800 text-gray-400">{card.game}</span>
              <span className="badge text-xs bg-gray-800 text-gray-400">{card.card_type === "sports" ? "運動卡" : "TCG"}</span>
            </div>
            <div className="flex items-start gap-3">
              <h1 className="text-3xl font-bold text-white flex-1">{card.name}</h1>
              {canEdit && (
                <button onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 bg-brand-900/30 hover:bg-brand-900/50 px-3 py-1.5 rounded-lg transition-colors shrink-0 mt-1">
                  <Edit2 className="w-3.5 h-3.5" /> 編輯
                </button>
              )}
            </div>
            {card.name_en && <div className="text-gray-400 text-sm mt-1">{card.name_en}</div>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[["系列", card.set_name ?? "-"], ["系列代碼", card.set_code ?? "-"], ["遊戲", card.game]].map(([k, v]) => (
              <div key={k} className="glass rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">{k}</div>
                <div className="text-sm font-medium text-gray-200 truncate">{v}</div>
              </div>
            ))}
          </div>

          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">社群均價（近期回報）</div>
                <div className="text-4xl font-bold text-white">
                  {avgPrice ? formatPrice(avgPrice) : <span className="text-2xl text-gray-500">尚無資料</span>}
                </div>
              </div>
              {reports.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-green-900/30 text-green-400">
                  <TrendingUp className="w-4 h-4" /> {reports.length} 筆回報
                </div>
              )}
            </div>
            <button onClick={() => setShowPriceReport(true)} className="btn-primary w-full text-sm">
              📊 回報成交價格
            </button>
          </div>

          {card.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{card.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {(["overview", "price", "discussion"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {{ overview: "卡牌資訊", price: "價格記錄", discussion: "相關討論" }[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">卡牌屬性</h3>
            {[["類型", card.card_type === "sports" ? "運動球員卡" : "集換式卡牌（TCG）"], ["遊戲", card.game], ["系列", card.set_name ?? "-"], ["稀有度", card.rarity ?? "-"]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">社群數據</h3>
            {[["價格回報數", `${reports.length} 筆`], ["社群均價", avgPrice ? formatPrice(avgPrice) : "尚無資料"], ["資料狀態", card.is_active ? "✅ 正常" : "❌ 下架"]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "price" && (
        <div className="space-y-4">

          {/* Scryfall 即時價格（僅 MTG） */}
          {card?.game === "MTG" && (
            <div className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-400" /> Scryfall 即時行情
                </h3>
                <a href={scryfallPrice?.scryfall_uri ?? `https://scryfall.com/search?q=${encodeURIComponent(card.name_en || card.name)}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-gray-500 hover:text-brand-400 transition-colors">
                  在 Scryfall 查看 →
                </a>
              </div>
              {scryfallLoading ? (
                <div className="flex gap-4">
                  {[1,2,3].map(i => <div key={i} className="h-12 w-24 rounded-lg shimmer" />)}
                </div>
              ) : scryfallPrice ? (
                <div className="flex flex-wrap gap-3">
                  {scryfallPrice.usd && (
                    <div className="bg-green-900/20 border border-green-700/30 rounded-lg px-4 py-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">普通版</div>
                      <div className="text-lg font-bold text-green-400">${scryfallPrice.usd}</div>
                    </div>
                  )}
                  {scryfallPrice.usd_foil && (
                    <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg px-4 py-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">閃卡版</div>
                      <div className="text-lg font-bold text-purple-400">${scryfallPrice.usd_foil}</div>
                    </div>
                  )}
                  {scryfallPrice.usd_etched && (
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-4 py-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">蝕刻版</div>
                      <div className="text-lg font-bold text-yellow-400">${scryfallPrice.usd_etched}</div>
                    </div>
                  )}
                  {!scryfallPrice.usd && !scryfallPrice.usd_foil && !scryfallPrice.usd_etched && (
                    <p className="text-sm text-gray-500">Scryfall 暫無此卡價格資料</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">無法載入 Scryfall 價格</p>
              )}
            </div>
          )}

        <div className="glass rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" /> 價格回報記錄
            </h3>
            <button onClick={() => setShowPriceReport(true)} className="btn-primary text-sm px-3 py-1.5">+ 回報價格</button>
          </div>

          {priceHistory.length > 0 && (
            <div className="h-48">
              <PriceChart data={priceHistory} />
            </div>
          )}

          <div className="space-y-2">
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                還沒有價格回報，來做第一個吧！
              </div>
            ) : reports.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-white/5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-200 font-bold">{formatPrice(r.price)}</span>
                  <span className="badge text-xs bg-gray-800 text-gray-400">{r.condition}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 text-xs">
                  <span>{r.profiles?.username ?? "匿名"}</span>
                  <span>{timeAgo(new Date(r.created_at))}</span>
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noreferrer"
                      className="text-brand-400 hover:text-brand-300">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeTab === "discussion" && (
        <div className="text-center py-10 space-y-3 text-gray-500">
          <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm">前往社群討論此卡牌</p>
          <Link href={`/community?search=${encodeURIComponent(card.name)}`} className="btn-primary text-sm inline-flex">
            搜尋相關討論
          </Link>
        </div>
      )}
    </div>
  );
}
