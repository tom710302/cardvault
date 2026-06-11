"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp, MessageSquare, Users, Star, ArrowRight, Flame, Zap, Trophy, ChevronRight } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const postTypeConfig: Record<string, { label: string; color: string }> = {
  showcase: { label: "📸 展示", color: "text-purple-400 bg-purple-900/30" },
  price_check: { label: "💰 價格詢問", color: "text-yellow-400 bg-yellow-900/30" },
  discussion: { label: "🗣️ 討論", color: "text-blue-400 bg-blue-900/30" },
  news: { label: "📰 資訊", color: "text-green-400 bg-green-900/30" },
};

const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

export default function HomePage() {
  const [stores, setStores] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: "...", cards: "...", posts: "..." });
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const [storesRes, postsData, usersData, statsData] = await Promise.all([
        fetch("/api/stores"),
        supabase.from("posts").select("*, profiles(username, avatar_url, reputation)").eq("is_deleted", false).order("upvotes", { ascending: false }).limit(4),
        supabase.from("profiles").select("id, username, reputation, created_at").order("reputation", { ascending: false }).limit(5),
        Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("cards").select("id", { count: "exact", head: true }),
          supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        ]),
      ]);

      if (storesRes.ok) { const { stores } = await storesRes.json(); setStores((stores ?? []).slice(0, 4)); }
      if (postsData.data) setPosts(postsData.data);
      if (usersData.data) setUsers(usersData.data);
      setStats({
        users: (statsData[0].count ?? 0).toLocaleString(),
        cards: (statsData[1].count ?? 0).toLocaleString(),
        posts: (statsData[2].count ?? 0).toLocaleString(),
      });
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">

      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-950 via-gray-900 to-purple-950 border border-white/10 p-8 md:p-14">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #5c6aff33 0%, transparent 60%)" }} />
        <div className="relative max-w-2xl space-y-5">
          <div className="badge text-brand-300 bg-brand-900/50 border border-brand-700/50 text-sm">
            🔍 台灣最大實體卡牌交流社群
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white">
            你的珍藏值得<br /><span className="text-gradient">被世界看見</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            集合 TCG 玩家與運動卡收藏家，一起討論、展示、追蹤市場行情。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/community" className="btn-primary flex items-center gap-2">加入討論 <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/search?tab=stores" className="btn-secondary flex items-center gap-2">探索店家</Link>
          </div>
        </div>
        <div className="relative mt-10 md:mt-0 md:absolute md:right-10 md:top-1/2 md:-translate-y-1/2 grid grid-cols-3 md:grid-cols-1 gap-3">
          {[{ value: stats.users + "+", label: "收藏家" }, { value: stats.cards + "+", label: "卡牌資料" }, { value: stats.posts + "+", label: "社群文章" }].map(({ value, label }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 熱門店家 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> 熱門店家</h2>
          <Link href="/search?tab=stores" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">查看全部 <ChevronRight className="w-4 h-4" /></Link>
        </div>
        {stores.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-52 shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {stores.map((store) => (
              <Link href={`/stores/${store.id}`} key={store.id} className="glass rounded-xl overflow-hidden card-hover group block">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {store.image_url
                    ? <img src={store.image_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
                  }
                  {store.is_verified && (
                    <div className="absolute top-2 left-2 bg-brand-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                      ✓ 官方驗證
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <div className="text-sm font-semibold text-white line-clamp-1 group-hover:text-brand-300 transition-colors">{store.name}</div>
                  <div className="text-xs text-gray-500">{store.city}</div>
                  {store.games?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {store.games.slice(0, 3).map((g: string) => (
                        <span key={g} className="text-sm">{gameEmoji[g] ?? "🃏"}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 熱門討論 + 側邊欄 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> 熱門討論</h2>
            <Link href="/community" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">更多 <ChevronRight className="w-4 h-4" /></Link>
          </div>
          {posts.length === 0 ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}
            </div>
          ) : posts.map((post) => {
            const tc = postTypeConfig[post.post_type] ?? { label: post.post_type, color: "text-gray-400 bg-gray-800" };
            return (
              <Link href={`/community/${post.id}`} key={post.id} className="glass rounded-xl p-4 flex gap-4 card-hover group block">
                <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                  <span className="text-gray-600">▲</span>
                  <span className="text-sm font-bold text-gray-300">{post.upvotes}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${tc.color}`}>{tc.label}</span>
                    <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
                  </div>
                  <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug line-clamp-2">{post.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                        {post.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                      </span>
                      {post.profiles?.username}
                    </span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /></span>
                    <span>{post.view_count} 瀏覽</span>
                    <span>{timeAgo(new Date(post.created_at))}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 側邊欄 */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-gold-400" />
              <h3 className="font-semibold text-white text-sm">聲望排行榜</h3>
            </div>
            <div className="space-y-3">
              {users.length === 0 ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-8 glass rounded shimmer" />
              )) : users.map((user, i) => (
                <Link href={`/users/${user.id}`} key={user.id} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1 transition-colors">
                  <span className="text-xs text-gray-600 w-4 text-center font-mono">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{user.username}</div>
                    <div className="text-xs text-gray-500">{user.reputation?.toLocaleString()} 聲望</div>
                  </div>
                  {i === 0 && <span className="text-base">👑</span>}
                </Link>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">快速導覽</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ icon: "⚔️", label: "MTG", href: "/cards?game=MTG" }, { icon: "⚡", label: "寶可夢", href: "/cards?game=寶可夢" }, { icon: "🌀", label: "遊戲王", href: "/cards?game=遊戲王" }, { icon: "🏀", label: "NBA", href: "/cards?game=NBA" }, { icon: "⚾", label: "MLB", href: "/cards?game=MLB" }, { icon: "📈", label: "社群", href: "/community" }].map(({ icon, label, href }) => (
                <Link key={label} href={href} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-sm">
                  <span>{icon}</span> {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
