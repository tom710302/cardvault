"use client";

import { useState } from "react";
import { mockUsers, mockCards } from "@/lib/mockData";
import { formatPrice, cn } from "@/lib/utils";
import { Heart, Eye, MessageSquare, Trophy, Star } from "lucide-react";

const showcaseItems = mockUsers.map((user, i) => ({
  user,
  title: [
    "我的完整 Alpha MTG 收藏 — 花了十年終於集齊",
    "Pikachu Illustrator PSA 10 入手心得",
    "LeBron James RC 完整系列展示",
    "遊戲王初期版珍藏開箱紀錄",
    "2023 MLB 大谷翔平年度最佳卡片集",
  ][i],
  cards: mockCards.slice(i % 2, (i % 2) + 3),
  likes: [1203, 891, 654, 432, 218][i],
  views: [22451, 15673, 8932, 4821, 2341][i],
  comments: [318, 234, 156, 87, 47][i],
  featured: i < 2,
}));

export default function ShowcasePage() {
  const [filter, setFilter] = useState("all");

  const filters = [
    { id: "all", label: "全部展示" },
    { id: "tcg", label: "TCG 卡牌" },
    { id: "sports", label: "運動卡" },
    { id: "featured", label: "精選" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">收藏展示牆</h1>
          <p className="text-gray-400 text-sm mt-1">欣賞來自全台收藏家的珍藏，分享屬於你的驕傲</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shrink-0">
          <Star className="w-4 h-4" /> 分享我的收藏
        </button>
      </div>

      {/* Featured Banner */}
      <div className="glass rounded-2xl p-6 border border-gold-500/20"
        style={{ background: "linear-gradient(135deg, rgba(245,200,66,0.08) 0%, rgba(92,106,255,0.08) 100%)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-gold-400" />
          <span className="text-gold-400 font-semibold">本週精選收藏</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showcaseItems.filter((s) => s.featured).map((item) => (
            <div key={item.user.id} className="bg-white/5 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {item.user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white line-clamp-2 text-sm leading-snug">{item.title}</div>
                <div className="text-xs text-gray-500 mt-1">{item.user.name} · {item.user.cards.toLocaleString()} 張收藏</div>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> {item.likes.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              filter === f.id ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            )}
          >{f.label}</button>
        ))}
      </div>

      {/* Masonry-style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {showcaseItems.map((item, idx) => (
          <div key={item.user.id}
            className={cn("glass rounded-2xl overflow-hidden card-hover cursor-pointer group", idx === 0 && "sm:col-span-2 lg:col-span-1")}>

            {/* Card Preview Strip */}
            <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center gap-3 p-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{ background: "radial-gradient(circle at 50% 50%, #5c6aff44 0%, transparent 70%)" }} />
              {item.cards.map((card, ci) => (
                <div key={card.id}
                  className="w-16 h-24 rounded-lg bg-gray-700 flex items-center justify-center text-2xl border border-white/10 shadow-lg transition-transform group-hover:scale-105"
                  style={{ transform: `rotate(${(ci - 1) * 8}deg)`, zIndex: ci === 1 ? 10 : 5 }}>
                  🃏
                </div>
              ))}
            </div>

            <div className="p-4 space-y-3">
              {/* Author */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {item.user.avatar}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">{item.user.name}</div>
                  <div className="text-xs text-gray-500">{item.user.reputation.toLocaleString()} 聲望</div>
                </div>
                {item.featured && (
                  <span className="ml-auto badge text-xs text-gold-400 bg-gold-900/30">⭐ 精選</span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white leading-snug">
                {item.title}
              </h3>

              {/* Card previews */}
              <div className="flex gap-2">
                {item.cards.slice(0, 3).map((card) => (
                  <div key={card.id} className="flex-1 bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400 truncate">{card.name}</div>
                    <div className="text-xs text-brand-400 font-medium mt-0.5">{formatPrice(card.price)}</div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-xs text-gray-500">
                <button className="flex items-center gap-1 hover:text-red-400 transition-colors" onClick={(e) => e.preventDefault()}>
                  <Heart className="w-3.5 h-3.5" /> {item.likes.toLocaleString()}
                </button>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {item.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {item.comments}
                </span>
                <span className="ml-auto text-brand-400 hover:text-brand-300 cursor-pointer">查看完整收藏 →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
