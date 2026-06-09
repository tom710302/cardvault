"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, MessageSquare, Eye, TrendingUp, Flame, Clock, Award } from "lucide-react";
import { mockPosts, boards } from "@/lib/mockData";
import { timeAgo, cn } from "@/lib/utils";

const sortTabs = [
  { id: "hot", label: "熱門", icon: Flame },
  { id: "new", label: "最新", icon: Clock },
  { id: "top", label: "精選", icon: Award },
];

const postTypeConfig = {
  showcase: { label: "📸 展示", color: "text-purple-400 bg-purple-900/30" },
  price_check: { label: "💰 價格詢問", color: "text-yellow-400 bg-yellow-900/30" },
  discussion: { label: "🗣️ 討論", color: "text-blue-400 bg-blue-900/30" },
  news: { label: "📰 資訊", color: "text-green-400 bg-green-900/30" },
};

export default function CommunityPage() {
  const [activeBoard, setActiveBoard] = useState("all");
  const [activeSort, setActiveSort] = useState("hot");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar: Boards */}
        <aside className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">版塊選擇</h3>
            <ul className="space-y-1">
              {boards.map((board) => (
                <li key={board.id}>
                  <button
                    onClick={() => setActiveBoard(board.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      activeBoard === board.id
                        ? "bg-brand-600/20 text-brand-300"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{board.icon}</span>
                      <span className="font-medium">{board.label}</span>
                    </span>
                    <span className="text-xs text-gray-600">{board.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">發文規則</h3>
            <ul className="text-xs text-gray-500 space-y-1.5">
              {[
                "請選擇正確板塊發文",
                "標題清楚描述內容",
                "價格詢問請附圖片",
                "尊重其他收藏家",
                "禁止廣告或詐騙行為",
              ].map((rule, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-brand-500 shrink-0">{i + 1}.</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">社群討論</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {boards.find((b) => b.id === activeBoard)?.label ?? "全部"} 板 —{" "}
                {boards.find((b) => b.id === activeBoard)?.count ?? "1,234"} 篇文章
              </p>
            </div>
            <button className="btn-primary flex items-center gap-2 shrink-0">
              <PenLine className="w-4 h-4" /> 發文
            </button>
          </div>

          {/* Sort Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-0">
            {sortTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSort(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeSort === id
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Posts */}
          <div className="space-y-3 pt-2">
            {mockPosts.map((post) => {
              const typeConfig = postTypeConfig[post.type as keyof typeof postTypeConfig];
              return (
                <Link href={`/community/${post.id}`} key={post.id}
                  className="glass rounded-xl p-4 flex gap-4 card-hover group block">
                  {/* Vote Column */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-1 min-w-[36px]">
                    <button
                      className="text-gray-600 hover:text-brand-400 transition-colors text-lg leading-none"
                      onClick={(e) => e.preventDefault()}
                    >▲</button>
                    <span className="text-sm font-bold text-gray-300">{post.upvotes}</span>
                    <button
                      className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                      onClick={(e) => e.preventDefault()}
                    >▼</button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-xs ${typeConfig.color}`}>{typeConfig.label}</span>
                      <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
                      {post.image && (
                        <span className="badge text-xs bg-gray-800 text-gray-400">🖼️ 附圖</span>
                      )}
                    </div>

                    <h2 className="font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug">
                      {post.title}
                    </h2>

                    <p className="text-sm text-gray-500 line-clamp-1">{post.content}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                          {post.author.avatar}
                        </span>
                        <span className="text-gray-400">{post.author.name}</span>
                        <span className="text-gray-600">· {post.author.reputation.toLocaleString()} 聲望</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {post.comments} 留言
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {post.views.toLocaleString()}
                      </span>
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs text-brand-400 hover:text-brand-300 cursor-pointer">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Load More */}
          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" /> 載入更多
          </button>
        </div>
      </div>
    </div>
  );
}
