"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, Star } from "lucide-react";
import { mockCards } from "@/lib/mockData";
import { formatPrice, cn } from "@/lib/utils";

const games = ["全部", "MTG", "寶可夢", "遊戲王", "NBA", "MLB"];
const sortOptions = [
  { value: "trending", label: "熱門排行" },
  { value: "price_desc", label: "價格（高→低）" },
  { value: "price_asc", label: "價格（低→高）" },
  { value: "change_desc", label: "漲幅最大" },
];

export default function CardsPage() {
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("全部");
  const [sort, setSort] = useState("trending");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = mockCards
    .filter((c) => (game === "全部" || c.game === game) && c.name.includes(search))
    .sort((a, b) => {
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "change_desc") return b.priceChange - a.priceChange;
      return b.price - a.price;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">卡牌資料庫</h1>
        <p className="text-gray-400 text-sm">瀏覽 120 萬+ 張實體卡牌的市場行情與社群評價</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 input flex-1">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100"
              placeholder="搜尋卡牌名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input text-sm bg-gray-900"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setView("grid")}
              className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "grid" ? "bg-brand-600 text-white" : "btn-secondary")}
            >⊞</button>
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "list" ? "bg-brand-600 text-white" : "btn-secondary")}
            >☰</button>
          </div>
        </div>

        {/* Game Filter */}
        <div className="flex gap-2 flex-wrap">
          {games.map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                game === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              )}
            >{g}</button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          找到 <span className="text-gray-300 font-medium">{filtered.length}</span> 張卡牌
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <SlidersHorizontal className="w-3 h-3" /> 進階篩選
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((card) => (
            <Link href={`/cards/${card.id}`} key={card.id}
              className="glass rounded-xl overflow-hidden card-hover group">
              <div className="aspect-[5/7] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                  style={{ background: `radial-gradient(circle, ${card.rarityColor}55 0%, transparent 70%)` }} />
                <span className="text-5xl">🃏</span>
              </div>
              <div className="p-2.5 space-y-1">
                <div className="text-xs font-semibold text-white leading-tight line-clamp-2">{card.name}</div>
                <div className="text-[10px] text-gray-500">{card.game}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-400">{formatPrice(card.price)}</span>
                  <span className={`text-[10px] font-bold ${card.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {card.priceChange >= 0 ? "▲" : "▼"}{Math.abs(card.priceChange)}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
          {filtered.map((card) => (
            <Link href={`/cards/${card.id}`} key={card.id}
              className="glass rounded-xl p-4 flex items-center gap-4 card-hover group">
              <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">🃏</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">{card.name}</div>
                <div className="text-xs text-gray-500">{card.game} · {card.set} · {card.rarity}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {card.tags.slice(0, 3).map((t) => (
                    <span key={t} className="badge text-[10px] bg-gray-800 text-gray-400">{t}</span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-brand-400">{formatPrice(card.price)}</div>
                <div className={`text-xs font-medium flex items-center gap-1 justify-end mt-1 ${card.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {card.priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(card.priceChange)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">{card.condition}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>找不到符合條件的卡牌</p>
          <button onClick={() => { setSearch(""); setGame("全部"); }} className="btn-secondary mt-3 text-sm">
            清除篩選
          </button>
        </div>
      )}
    </div>
  );
}
