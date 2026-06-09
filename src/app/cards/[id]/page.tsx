"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, BookmarkPlus, Share2, Star, TrendingUp, MessageSquare, ExternalLink } from "lucide-react";
import { mockCards, mockPriceHistory, mockPosts } from "@/lib/mockData";
import { formatPrice, timeAgo } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function CardDetailPage({ params }: { params: { id: string } }) {
  const card = mockCards.find((c) => c.id === params.id) ?? mockCards[0];
  const [activeTab, setActiveTab] = useState<"overview" | "price" | "discussion">("overview");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const relatedPosts = mockPosts.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Back */}
      <Link href="/cards" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回卡牌資料庫
      </Link>

      {/* Main Card Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card Image */}
        <div className="space-y-4">
          <div className="aspect-[5/7] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative border border-white/10 shadow-2xl"
            style={{ boxShadow: `0 25px 60px ${card.rarityColor}22` }}>
            <div className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(circle, ${card.rarityColor}88 0%, transparent 70%)` }} />
            <span className="text-[120px]">🃏</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setLiked((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border ${liked ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}>
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} /> {liked ? "已收藏" : "收藏"}
            </button>
            <button
              onClick={() => setSaved((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border ${saved ? "bg-brand-500/20 text-brand-400 border-brand-500/30" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}>
              <BookmarkPlus className="w-4 h-4" /> 加入收藏庫
            </button>
            <button className="px-3 py-2.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge text-xs" style={{ background: `${card.rarityColor}22`, color: card.rarityColor }}>
                {card.rarity}
              </span>
              <span className="badge text-xs bg-gray-800 text-gray-400">{card.game}</span>
              <span className="badge text-xs bg-gray-800 text-gray-400">{card.type === "tcg" ? "TCG" : "運動卡"}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{card.name}</h1>
            <div className="text-gray-400 text-sm mt-1">{card.nameEn}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "系列", value: card.set },
              { label: "品相", value: card.condition },
              { label: "系列代碼", value: card.setCode },
            ].map(({ label, value }) => (
              <div key={label} className="glass rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-sm font-medium text-gray-200">{value}</div>
              </div>
            ))}
          </div>

          {/* Price Block */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">社群均價（近90天）</div>
                <div className="text-4xl font-bold text-white">{formatPrice(card.price)}</div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${card.priceChange >= 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                <TrendingUp className="w-4 h-4" />
                {card.priceChange >= 0 ? "+" : ""}{card.priceChange}%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "30天低", value: formatPrice(card.price * 0.92) },
                { label: "30天均", value: formatPrice(card.price * 0.97) },
                { label: "30天高", value: formatPrice(card.price * 1.05) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-sm font-semibold text-gray-200 mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            <button className="btn-primary w-full">回報成交價格</button>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed">{card.description}</p>

          <div className="flex flex-wrap gap-2">
            {card.tags.map((tag) => (
              <span key={tag} className="badge text-xs bg-brand-900/30 text-brand-300 border border-brand-700/30">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {(["overview", "price", "discussion"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
              {{ overview: "卡牌資訊", price: "價格趨勢", discussion: "相關討論" }[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "price" && (
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" /> 近半年價格走勢
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPriceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }}
                  formatter={(value: number) => [formatPrice(value), "成交均價"]}
                />
                <Line type="monotone" dataKey="price" stroke="#5c6aff" strokeWidth={2.5}
                  dot={{ fill: "#5c6aff", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-300 mb-3">近期成交紀錄</h4>
            {[
              { price: card.price, condition: card.condition, date: "3天前", source: "Yahoo拍賣" },
              { price: card.price * 0.95, condition: "LP", date: "1週前", source: "社群回報" },
              { price: card.price * 1.02, condition: "NM", date: "2週前", source: "露天" },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-200 font-medium">{formatPrice(tx.price)}</span>
                  <span className="badge text-xs bg-gray-800 text-gray-400">{tx.condition}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <span>{tx.source}</span>
                  <span>{tx.date}</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-gold-400" /> 卡牌屬性
            </h3>
            {[
              ["類型", card.type === "tcg" ? "集換式卡牌（TCG）" : "運動球員卡"],
              ["遊戲", card.game],
              ["系列", card.set],
              ["稀有度", card.rarity],
              ["品相", card.condition],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">社群數據</h3>
            {[
              ["收藏人數", "2,341 人"],
              ["Wishlist 人數", "892 人"],
              ["評論數", "47 則"],
              ["社群評分", "4.8 / 5.0 ★"],
              ["資料最後更新", "今天"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "discussion" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">3 則相關討論</span>
            <button className="btn-primary text-sm">發起討論</button>
          </div>
          {relatedPosts.map((post) => (
            <Link href={`/community/${post.id}`} key={post.id}
              className="glass rounded-xl p-4 flex gap-3 card-hover group">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{post.author.name}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments}</span>
                  <span>{timeAgo(post.createdAt)}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1 shrink-0">
                ▲ {post.upvotes}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
