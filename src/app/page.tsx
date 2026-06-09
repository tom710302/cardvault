"use client";

import Link from "next/link";
import {
  TrendingUp, MessageSquare, Users, Star, ArrowRight,
  Flame, Zap, Trophy, ChevronRight
} from "lucide-react";
import { mockCards, mockPosts, mockUsers } from "@/lib/mockData";
import { formatPrice, timeAgo } from "@/lib/utils";

const postTypeConfig = {
  showcase: { label: "展示", color: "text-purple-400 bg-purple-900/30" },
  price_check: { label: "價格詢問", color: "text-yellow-400 bg-yellow-900/30" },
  discussion: { label: "討論", color: "text-blue-400 bg-blue-900/30" },
  news: { label: "資訊", color: "text-green-400 bg-green-900/30" },
};

export default function HomePage() {
  const featuredCards = mockCards.slice(0, 4);
  const hotPosts = mockPosts.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">

      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-950 via-gray-900 to-purple-950 border border-white/10 p-8 md:p-14">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #5c6aff33 0%, transparent 60%)" }} />
        <div className="relative max-w-2xl space-y-5">
          <div className="badge text-brand-300 bg-brand-900/50 border border-brand-700/50 text-sm">
            🔍 台灣最大實體卡牌交流社群
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white">
            你的珍藏值得<br />
            <span className="text-gradient">被世界看見</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            集合 TCG 玩家與運動卡收藏家，一起討論、展示、追蹤市場行情。加入超過 50,000 位卡牌同好。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/community" className="btn-primary flex items-center gap-2">
              加入討論 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/cards" className="btn-secondary flex items-center gap-2">
              瀏覽卡牌資料庫
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-10 md:mt-0 md:absolute md:right-10 md:top-1/2 md:-translate-y-1/2 grid grid-cols-3 md:grid-cols-1 gap-3">
          {[
            { icon: Users, value: "50,000+", label: "收藏家" },
            { icon: Star, value: "120萬+", label: "卡牌資料" },
            { icon: MessageSquare, value: "8,000+", label: "每日討論" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 text-brand-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 熱門卡牌 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">熱門卡牌</h2>
          </div>
          <Link href="/cards" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
            查看全部 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredCards.map((card) => (
            <Link href={`/cards/${card.id}`} key={card.id}
              className="glass rounded-xl overflow-hidden card-hover group">
              <div className="aspect-[5/7] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ background: `radial-gradient(circle, ${card.rarityColor}66 0%, transparent 70%)` }} />
                <span className="text-6xl">🃏</span>
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-sm font-semibold text-white leading-tight line-clamp-1">{card.name}</span>
                  <span className={`badge text-xs shrink-0 ${card.priceChange >= 0 ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30"}`}>
                    {card.priceChange >= 0 ? "▲" : "▼"} {Math.abs(card.priceChange)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">{card.game} · {card.set.slice(0, 16)}</div>
                <div className="text-sm font-bold text-brand-400">{formatPrice(card.price)}</div>
                <div className="flex gap-1 flex-wrap">
                  <span className="badge text-[10px] rarity-ultra">{card.condition}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 主要內容區：熱門貼文 + 側邊欄 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 熱門討論 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">熱門討論</h2>
            </div>
            <Link href="/community" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              更多 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {hotPosts.map((post) => {
            const typeConfig = postTypeConfig[post.type as keyof typeof postTypeConfig];
            return (
              <Link href={`/community/${post.id}`} key={post.id}
                className="glass rounded-xl p-4 flex gap-4 card-hover group">
                {/* 投票 */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                  <button className="text-gray-600 hover:text-brand-400 transition-colors" onClick={(e) => e.preventDefault()}>▲</button>
                  <span className="text-sm font-bold text-gray-300">{post.upvotes}</span>
                </div>

                {/* 內容 */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${typeConfig.color}`}>{typeConfig.label}</span>
                    <span className="badge text-xs text-gray-400 bg-gray-800">{post.board}</span>
                  </div>
                  <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                        {post.author.avatar}
                      </span>
                      {post.author.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {post.comments} 留言
                    </span>
                    <span>{post.views.toLocaleString()} 瀏覽</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 側邊欄 */}
        <div className="space-y-6">

          {/* 活躍收藏家 */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-gold-400" />
              <h3 className="font-semibold text-white text-sm">本週活躍收藏家</h3>
            </div>
            <div className="space-y-3">
              {mockUsers.map((user, i) => (
                <div key={user.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-4 text-center font-mono">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.cards.toLocaleString()} 張 · {user.reputation.toLocaleString()} 聲望</div>
                  </div>
                  {i === 0 && <span className="text-base">👑</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 快速連結 */}
          <div className="glass rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">快速導覽</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "⚔️", label: "MTG", href: "/community?board=mtg" },
                { icon: "⚡", label: "寶可夢", href: "/community?board=pokemon" },
                { icon: "🌀", label: "遊戲王", href: "/community?board=yugioh" },
                { icon: "🏀", label: "NBA", href: "/community?board=nba" },
                { icon: "⚾", label: "MLB", href: "/community?board=mlb" },
                { icon: "📈", label: "價格榜", href: "/cards?sort=trending" },
              ].map(({ icon, label, href }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-sm">
                  <span>{icon}</span> {label}
                </Link>
              ))}
            </div>
          </div>

          {/* 今日行情摘要 */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h3 className="font-semibold text-white text-sm">今日漲跌幅排行</h3>
            </div>
            <div className="space-y-2">
              {mockCards.sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange)).slice(0, 4).map((card) => (
                <div key={card.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate max-w-[140px]">{card.name}</span>
                  <span className={`font-mono text-xs font-bold ${card.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {card.priceChange >= 0 ? "+" : ""}{card.priceChange}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
