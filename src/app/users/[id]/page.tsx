"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Grid3X3, Star, Package, ArrowLeft, MessageSquare, ArrowLeftRight } from "lucide-react";
import { TrustBadge } from "@/components/trade/TrustBadge";
import { cn, timeAgo } from "@/lib/utils";

interface Profile {
  id: string; username: string; display_name: string | null; bio: string | null;
  avatar_url: string | null; reputation: number; role: string; created_at: string;
}
interface CollectionItem {
  id: string; card_id: string; condition: string; quantity: number;
  image_url: string | null; cards: any;
}
interface Post {
  id: string; title: string; board: string; post_type: string;
  upvotes: number; view_count: number; created_at: string; image_urls: string[] | null;
}

const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"collection" | "posts" | "trade">("collection");
  const [tradeHaves, setTradeHaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      // Check if viewing own profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === params.id) { router.replace("/my-page"); return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single();
      if (!p) { setLoading(false); return; }
      setProfile(p);

      // Load public collection
      const { data: col } = await supabase.from("collections")
        .select("id, card_id, condition, quantity, image_url, cards(id, name, game, rarity, image_url)")
        .eq("user_id", params.id).eq("visibility", "public").order("created_at", { ascending: false });
      setCollection(col ?? []);

      // Load posts
      const { data: postsData } = await supabase.from("posts")
        .select("id, title, board, post_type, upvotes, view_count, created_at, image_urls")
        .eq("author_id", params.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(30);
      setPosts(postsData ?? []);

      // Load trade haves
      const tradeRes = await fetch(`/api/trade/haves?user_id=${params.id}`);
      if (tradeRes.ok) { const { haves } = await tradeRes.json(); setTradeHaves(haves ?? []); }

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="glass rounded-2xl h-40 shimmer" />
      <div className="grid grid-cols-3 gap-1">{Array(9).fill(0).map((_, i) => <div key={i} className="aspect-square glass shimmer" />)}</div>
    </div>
  );

  if (!profile) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500 space-y-3">
      <p className="text-lg">找不到此用戶</p>
      <Link href="/" className="btn-secondary text-sm inline-flex">← 返回首頁</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <div className="px-4 pt-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
      </div>

      {/* Profile Header */}
      <div className="px-4 pt-4 pb-4 space-y-5">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold border-2 border-white/10 overflow-hidden shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              : profile.username?.[0]?.toUpperCase() ?? "?"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-xl font-bold text-white">{profile.username}</h1>
              {profile.role !== "user" && (
                <span className={`badge text-xs ${profile.role === "admin" ? "text-red-400 bg-red-900/30" : profile.role === "store_owner" ? "text-orange-400 bg-orange-900/30" : "text-yellow-400 bg-yellow-900/30"}`}>
                  {profile.role}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{collection.length}</div>
                <div className="text-xs text-gray-500">收藏</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{posts.length}</div>
                <div className="text-xs text-gray-500">貼文</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{profile.reputation.toLocaleString()}</div>
                <div className="text-xs text-gray-500">聲望</div>
              </div>
            </div>

            {/* Bio */}
            <div className="text-sm space-y-0.5 mb-2">
              {profile.display_name && profile.display_name !== profile.username && (
                <p className="font-semibold text-gray-200">{profile.display_name}</p>
              )}
              {profile.bio && <p className="text-gray-400 leading-relaxed">{profile.bio}</p>}
              <p className="text-gray-600 text-xs">{new Date(profile.created_at).toLocaleDateString("zh-TW")} 加入</p>
            </div>

            {/* Trust Badge */}
            <TrustBadge userId={params.id} size="sm" />
          </div>
        </div>

        {/* Message Button */}
        <div className="flex gap-2">
          <Link href={`/community?search=${encodeURIComponent(profile.username)}`}
            className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> 查看 TA 的文章
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-white/10 flex">
        {([
          ["collection", <Grid3X3 className="w-5 h-5" />, "收藏"],
          ["posts", <Star className="w-5 h-5" />, "貼文"],
          ["trade", <ArrowLeftRight className="w-5 h-5" />, "換卡"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-t-2 -mt-px transition-colors",
              tab === id ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            )}>
            {icon} <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Collection Grid */}
      {tab === "collection" && (
        collection.length === 0 ? (
          <div className="text-center py-20 text-gray-500 space-y-2">
            <Package className="w-10 h-10 mx-auto opacity-30" />
            <p>沒有公開的收藏</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-0.5">
              {collection.map(item => {
                const inner = (
                  <>
                    {item.image_url || item.cards?.image_url ? (
                      <img
                        src={item.image_url ?? item.cards?.image_url ?? ""}
                        alt={item.cards?.name ?? ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <span className="text-4xl">{gameEmoji[item.cards?.game ?? ""] ?? "🃏"}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <p className="text-white text-xs font-semibold text-center px-2 line-clamp-2">{item.cards?.name}</p>
                      <p className="text-gray-300 text-[10px]">{item.condition}</p>
                    </div>
                    {item.quantity > 1 && (
                      <div className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ×{item.quantity}
                      </div>
                    )}
                  </>
                );
                const cls = "relative aspect-square bg-gray-900 overflow-hidden group";
                return item.card_id ? (
                  <Link key={item.id} href={`/cards/${item.card_id}`} className={cls}>{inner}</Link>
                ) : (
                  <div key={item.id} className={cls}>{inner}</div>
                );
              })}
            </div>
            <div className="text-center py-3 text-xs text-gray-600">共 {collection.length} 張公開收藏</div>
          </div>
        )
      )}

      {/* Trade Tab */}
      {tab === "trade" && (
        <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
          {/* Trust detail */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-brand-400" /> 換卡信譽
            </h2>
            <TrustBadge userId={params.id} size="md" />
          </div>

          {/* Haves */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              可換清單（{tradeHaves.length} 張）
            </h3>
            {tradeHaves.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-gray-500 text-sm">
                還沒有登記可換的牌
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {tradeHaves.map((h: any) => (
                  <div key={h.id} className="relative aspect-square bg-gray-900 overflow-hidden group">
                    {h.image_url
                      ? <img src={h.image_url} alt={h.card_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-4xl">🃏</div>
                    }
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                      <p className="text-white text-[10px] font-semibold text-center line-clamp-2">{h.card_name}</p>
                      <p className="text-gray-300 text-[10px]">{h.card_game} · {h.condition}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      {tab === "posts" && (
        posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500 space-y-2">
            <Star className="w-10 h-10 mx-auto opacity-30" />
            <p>還沒有發過貼文</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map(post => (
              <Link key={post.id} href={`/community/${post.id}`}
                className="relative aspect-square bg-gray-900 overflow-hidden group">
                {post.image_urls && post.image_urls.length > 0 ? (
                  <img src={post.image_urls[0]} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-br from-gray-800 to-gray-900">
                    <span className="text-2xl">
                      {{ discussion: "🗣️", showcase: "📸", price_check: "💰", news: "📰" }[post.post_type] ?? "📝"}
                    </span>
                    <p className="text-white text-[10px] font-medium text-center line-clamp-3 leading-tight">{post.title}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-medium">
                  <span>▲ {post.upvotes}</span>
                  <span>👁 {post.view_count}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
      <div className="h-16" />
    </div>
  );
}
