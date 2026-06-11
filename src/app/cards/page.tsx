"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const games = ["全部", "MTG", "寶可夢", "遊戲王", "NBA", "MLB"];
const sortOptions = [
  { value: "name", label: "名稱排序" },
  { value: "game", label: "遊戲排序" },
  { value: "rarity", label: "稀有度" },
];

interface Card {
  id: string; name: string; name_en: string | null; game: string; card_type: string;
  set_name: string | null; rarity: string | null; image_url: string | null; description: string | null;
}

const gameEmoji: Record<string, string> = {
  MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", NFL: "🏈",
};

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("全部");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    setLoading(true);
    let url = `/api/cards?limit=100`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (game !== "全部") url += `&game=${encodeURIComponent(game)}`;
    const res = await fetch(url);
    if (res.ok) {
      let { cards } = await res.json();
      if (sort === "game") cards = [...cards].sort((a: Card, b: Card) => a.game.localeCompare(b.game));
      setCards(cards ?? []);
    }
    setLoading(false);
  }, [search, game, sort]);

  useEffect(() => {
    const t = setTimeout(fetchCards, 300);
    return () => clearTimeout(t);
  }, [fetchCards]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">卡牌資料庫</h1>
          <p className="text-gray-400 text-sm">瀏覽官方收錄的實體卡牌資料，點擊查看詳情與價格</p>
        </div>
        <Link href="/showcase"
          className="btn-primary flex items-center gap-2 shrink-0 text-sm">
          📸 分享我的收藏
        </Link>
      </div>

      {/* 提示說明 */}
      <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-gray-500">
        <span className="text-base shrink-0">💡</span>
        <p>卡牌資料庫由管理員統一維護。想分享你的卡牌收藏？請前往
          <Link href="/showcase" className="text-brand-400 hover:text-brand-300 mx-1">收藏展示</Link>
          上傳。
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1 focus-within:ring-2 focus-within:ring-brand-500">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜尋卡牌名稱..."
              className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setView("grid")}
              className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "grid" ? "bg-brand-600 text-white" : "btn-secondary")}>⊞</button>
            <button onClick={() => setView("list")}
              className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "list" ? "bg-brand-600 text-white" : "btn-secondary")}>☰</button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {games.map(g => (
            <button key={g} onClick={() => setGame(g)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                game === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              )}>
              {gameEmoji[g] ?? ""} {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          找到 <span className="text-gray-300 font-medium">{cards.length}</span> 張卡牌
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <SlidersHorizontal className="w-3 h-3" />
        </div>
      </div>

      {loading ? (
        <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4" : "space-y-2"}>
          {Array(12).fill(0).map((_, i) => (
            <div key={i} className={cn("glass rounded-xl shimmer", view === "grid" ? "aspect-[5/7]" : "h-16")} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <span className="text-4xl block mb-3">🃏</span>
          <p>找不到符合條件的卡牌</p>
          <button onClick={() => { setSearch(""); setGame("全部"); }}
            className="btn-secondary mt-3 text-sm">清除篩選</button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {cards.map(card => (
            <Link href={`/cards/${card.id}`} key={card.id}
              className="glass rounded-xl overflow-hidden card-hover group">
              <div className="aspect-[5/7] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl relative overflow-hidden">
                {card.image_url
                  ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  : <span>{gameEmoji[card.game] ?? "🃏"}</span>
                }
                <span className="absolute top-2 right-2 text-xs bg-black/50 px-1.5 py-0.5 rounded text-gray-300">
                  {card.card_type === "sports" ? "運動" : "TCG"}
                </span>
              </div>
              <div className="p-2.5 space-y-1">
                <div className="text-xs font-semibold text-white line-clamp-2 leading-tight">{card.name}</div>
                <div className="text-[10px] text-gray-500">{card.game}</div>
                {card.rarity && <div className="text-[10px] text-brand-400">{card.rarity}</div>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => (
            <Link href={`/cards/${card.id}`} key={card.id}
              className="glass rounded-xl p-4 flex items-center gap-4 card-hover group">
              <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {card.image_url
                  ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  : gameEmoji[card.game] ?? "🃏"
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">{card.name}</div>
                {card.name_en && <div className="text-xs text-gray-500 mt-0.5">{card.name_en}</div>}
                <div className="text-xs text-gray-500 mt-1">{card.game} · {card.set_name} · {card.rarity}</div>
              </div>
              <div className="shrink-0 text-right">
                <span className="badge text-xs bg-gray-800 text-gray-400">
                  {card.card_type === "sports" ? "運動卡" : "TCG"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
