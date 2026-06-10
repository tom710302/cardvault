"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, timeAgo, cn } from "@/lib/utils";
import { Heart, Eye, MessageSquare, Trophy, Star, Package } from "lucide-react";
import Link from "next/link";

interface ShowcaseUser {
  id: string; username: string; display_name: string | null;
  reputation: number; avatar_url: string | null;
  collection_count: number; collections: any[];
}

export default function ShowcasePage() {
  const [filter, setFilter] = useState("all");
  const [users, setUsers] = useState<ShowcaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, reputation, avatar_url")
        .order("reputation", { ascending: false })
        .limit(12);

      if (!profiles) { setLoading(false); return; }

      const usersWithCollections = await Promise.all(
        profiles.map(async (profile) => {
          const { data: collections, count } = await supabase
            .from("collections")
            .select("*, cards(id, name, game, rarity)", { count: "exact" })
            .eq("user_id", profile.id)
            .eq("visibility", "public")
            .limit(3);
          return { ...profile, collection_count: count ?? 0, collections: collections ?? [] };
        })
      );

      setUsers(usersWithCollections.filter(u => u.collection_count > 0 || u.reputation > 0));
      setLoading(false);
    }
    load();
  }, []);

  const filters = [
    { id: "all", label: "全部展示" },
    { id: "tcg", label: "TCG 卡牌" },
    { id: "sports", label: "運動卡" },
    { id: "top", label: "精選收藏家" },
  ];

  const filteredUsers = filter === "top"
    ? users.filter(u => u.reputation >= 100)
    : users;

  const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">收藏展示牆</h1>
          <p className="text-gray-400 text-sm mt-1">欣賞來自全台收藏家的珍藏，分享屬於你的驕傲</p>
        </div>
        <Link href="/collection" className="btn-primary flex items-center gap-2 shrink-0 text-sm">
          <Star className="w-4 h-4" /> 分享我的收藏
        </Link>
      </div>

      {/* Top Collectors */}
      {!loading && users.filter(u => u.reputation >= 50).length > 0 && (
        <div className="glass rounded-2xl p-6 border border-yellow-500/20"
          style={{ background: "linear-gradient(135deg, rgba(245,200,66,0.06) 0%, rgba(92,106,255,0.06) 100%)" }}>
          <h3 className="font-semibold text-yellow-400 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> 頂尖收藏家
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.filter(u => u.reputation >= 50).slice(0, 2).map((user) => (
              <Link href={`/users/${user.id}`} key={user.id}
                className="bg-white/5 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {user.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{user.display_name || user.username}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {user.collection_count} 張公開收藏 · {user.reputation.toLocaleString()} 聲望
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {user.collections.slice(0, 3).map((c: any) => (
                      <span key={c.id} className="badge text-[10px] bg-gray-800 text-gray-400">
                        {gameEmoji[c.cards?.game] ?? "🃏"} {c.cards?.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors",
              filter === f.id ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-64 shimmer" />)}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 text-gray-500 space-y-3">
          <Package className="w-12 h-12 mx-auto opacity-30" />
          <p>還沒有公開收藏，成為第一個展示的人吧！</p>
          <Link href="/collection" className="btn-primary text-sm inline-flex">開始收藏</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user, idx) => (
            <Link href={`/users/${user.id}`} key={user.id}
              className="glass rounded-2xl overflow-hidden card-hover cursor-pointer group">
              {/* Card Preview */}
              <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center gap-3 p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                  style={{ background: "radial-gradient(circle at 50% 50%, #5c6aff44 0%, transparent 70%)" }} />
                {user.collections.length > 0 ? user.collections.map((c: any, ci: number) => (
                  <div key={c.id} className="w-16 h-24 rounded-lg bg-gray-700 flex items-center justify-center text-2xl border border-white/10 shadow-lg transition-transform group-hover:scale-105"
                    style={{ transform: `rotate(${(ci - 1) * 8}deg)`, zIndex: ci === 1 ? 10 : 5 }}>
                    {gameEmoji[c.cards?.game] ?? "🃏"}
                  </div>
                )) : (
                  <div className="text-gray-600 text-sm">無公開收藏</div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{user.display_name || user.username}</div>
                    <div className="text-xs text-gray-500">{user.reputation.toLocaleString()} 聲望</div>
                  </div>
                  {idx < 3 && user.reputation > 0 && (
                    <span className="ml-auto badge text-xs text-yellow-400 bg-yellow-900/20">⭐ 精選</span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {user.collections.slice(0, 3).map((c: any) => (
                    <div key={c.id} className="flex-1 min-w-0 bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400 truncate">{c.cards?.name}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{c.condition}</div>
                    </div>
                  ))}
                  {user.collections.length === 0 && (
                    <div className="text-xs text-gray-600 italic">尚無公開收藏</div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" /> {user.collection_count} 張
                  </span>
                  <span className="ml-auto text-brand-400 group-hover:text-brand-300 font-medium">
                    查看個人主頁 →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
