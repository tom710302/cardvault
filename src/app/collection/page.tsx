"use client";

import { useState } from "react";
import { Plus, Search, BarChart3, Package, TrendingUp, Star, Grid3X3, List, Filter } from "lucide-react";
import { mockCards } from "@/lib/mockData";
import { formatPrice, cn } from "@/lib/utils";

const myCollection = mockCards.map((card, i) => ({
  ...card,
  quantity: [1, 2, 1, 1, 1, 1][i] ?? 1,
  myCondition: ["PSA 10", "NM", "LP", "BGS 9.5", "PSA 10", "PSA 10"][i],
  acquiredDate: ["2023-05", "2022-11", "2024-01", "2023-08", "2021-03", "2020-07"][i],
  myNotes: ["夢幻逸品，永遠不賣", "開包所得", "二手入手", "簽名版，限量100張", "傳家寶", "人生目標達成"][i],
}));

const stats = [
  { label: "總收藏數", value: "7 張", icon: Package, color: "text-blue-400" },
  { label: "估計總價值", value: formatPrice(myCollection.reduce((s, c) => s + c.price * c.quantity, 0)), icon: TrendingUp, color: "text-green-400" },
  { label: "最高單張", value: formatPrice(Math.max(...myCollection.map((c) => c.price))), icon: Star, color: "text-gold-400" },
  { label: "本月漲幅", value: "+8.3%", icon: BarChart3, color: "text-brand-400" },
];

export default function CollectionPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("value_desc");

  const filtered = myCollection
    .filter((c) => c.name.includes(search) || c.game.includes(search))
    .sort((a, b) => {
      if (sort === "value_desc") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">我的收藏庫</h1>
          <p className="text-gray-400 text-sm mt-1">管理、追蹤你的所有實體卡牌</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> 新增卡牌
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("w-4 h-4", color)} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Value Chart Placeholder */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" /> 收藏價值走勢
          </h3>
          <div className="flex gap-2">
            {["1個月", "3個月", "1年", "全部"].map((t) => (
              <button key={t} className={cn("text-xs px-2 py-1 rounded transition-colors",
                t === "3個月" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="h-32 flex items-end gap-1 px-2">
          {[65, 70, 68, 75, 82, 78, 88, 92, 85, 95, 98, 100].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-brand-600/30 hover:bg-brand-600/50 transition-colors relative group"
              style={{ height: `${h}%` }}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {(h * 185000).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2 px-2">
          {["7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月", "4月", "5月", "6月"].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 input flex-1">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100"
            placeholder="搜尋我的收藏..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input text-sm">
          <option value="value_desc">價值排序</option>
          <option value="name">名稱排序</option>
        </select>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" /> 篩選
          </button>
          <button onClick={() => setView("grid")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "grid" ? "bg-brand-600 text-white" : "btn-secondary")}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "list" ? "bg-brand-600 text-white" : "btn-secondary")}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collection Grid */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Add Card Button */}
          <button className="glass rounded-xl border-2 border-dashed border-white/10 hover:border-brand-500/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-brand-400 aspect-[5/7]">
            <Plus className="w-8 h-8" />
            <span className="text-xs">新增</span>
          </button>

          {filtered.map((card) => (
            <div key={card.id} className="glass rounded-xl overflow-hidden card-hover group cursor-pointer">
              <div className="aspect-[5/7] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-15"
                  style={{ background: `radial-gradient(circle, ${card.rarityColor}55 0%, transparent 70%)` }} />
                <span className="text-5xl">🃏</span>
                {card.quantity > 1 && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {card.quantity}
                  </span>
                )}
              </div>
              <div className="p-2.5 space-y-1">
                <div className="text-xs font-semibold text-white line-clamp-1">{card.name}</div>
                <div className="text-[10px] text-gray-500">{card.game} · {card.myCondition}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-400">{formatPrice(card.price)}</span>
                  <span className={`text-[10px] font-bold ${card.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {card.priceChange >= 0 ? "▲" : "▼"}{Math.abs(card.priceChange)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((card) => (
            <div key={card.id} className="glass rounded-xl p-4 flex items-center gap-4 card-hover cursor-pointer group">
              <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">🃏</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">{card.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{card.game} · {card.set} · {card.myCondition}</div>
                <div className="text-xs text-gray-600 mt-1 italic">{card.myNotes}</div>
              </div>
              <div className="shrink-0 text-right space-y-1">
                <div className="font-bold text-brand-400">{formatPrice(card.price)}</div>
                <div className="text-xs text-gray-500">入手：{card.acquiredDate}</div>
                <div className={`text-xs font-medium ${card.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {card.priceChange >= 0 ? "+" : ""}{card.priceChange}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
