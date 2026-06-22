"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Grid3X3, Star, Package, ArrowLeft, MessageSquare, ArrowLeftRight, Share2, ShieldOff, Flag, CheckCircle, X, Mail, ThumbsUp, ThumbsDown, Minus, UserPlus, UserCheck } from "lucide-react";
import { TrustBadge } from "@/components/trade/TrustBadge";
import { cn, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

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

const RARITY_TIERS: [string[], string][] = [
  [["hyper", "rainbow", "starlight", "prismatic", "gold star"], "text-yellow-300 bg-yellow-900/20 border-yellow-700/30"],
  [["special art", "special illustration", "secret", "ultra", "mythic", "amazing"], "text-purple-400 bg-purple-900/30 border-purple-700/30"],
  [["super", "holo", "full art", "illustration rare", "rare"], "text-blue-400 bg-blue-900/30 border-blue-700/30"],
  [["uncommon"], "text-green-400 bg-green-900/20 border-green-700/20"],
];
function rarityColor(rarity: string | null | undefined): string {
  if (!rarity) return "";
  const r = rarity.toLowerCase();
  for (const [kws, cls] of RARITY_TIERS) {
    if (kws.some(k => r.includes(k))) return cls;
  }
  return "text-gray-400 bg-gray-800/50 border-gray-700/20";
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"collection" | "posts" | "trade" | "reviews">("collection");
  const [tradeHaves, setTradeHaves] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [startingConv, setStartingConv] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ positive: 0, neutral: 0, negative: 0, total: 0 });
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      // Check if viewing own profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === params.id) { router.replace("/my-page"); return; }
      setCurrentUser(user ?? null);
      if (user) {
        fetch(`/api/users/${params.id}/block`).then(r => r.json()).then(d => setIsBlocked(d.blocked ?? false));
        fetch(`/api/users/${params.id}/follow`).then(r => r.json()).then(d => {
          setIsFollowing(d.following ?? false);
          setFollowerCount(d.follower_count ?? 0);
        });
      } else {
        fetch(`/api/users/${params.id}/follow`).then(r => r.json()).then(d => setFollowerCount(d.follower_count ?? 0));
      }

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

      // Load reviews
      const reviewRes = await fetch(`/api/users/${params.id}/reviews`);
      if (reviewRes.ok) {
        const { reviews, stats } = await reviewRes.json();
        setReviews(reviews ?? []);
        setReviewStats(stats ?? { positive: 0, neutral: 0, negative: 0, total: 0 });
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  async function toggleBlock() {
    if (!currentUser) return;
    setBlockLoading(true);
    const method = isBlocked ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${params.id}/block`, { method });
    if (res.ok) {
      const data = await res.json();
      setIsBlocked(data.blocked);
      toast.success(data.blocked ? "已封鎖此用戶" : "已解除封鎖");
    }
    setBlockLoading(false);
  }

  async function startConversation() {
    if (!currentUser || startingConv) return;
    setStartingConv(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: params.id }),
    });
    if (res.ok) {
      const { conversation } = await res.json();
      router.push(`/messages/${conversation.id}`);
    } else {
      toast.error("無法開啟對話");
      setStartingConv(false);
    }
  }

  async function submitReport() {
    if (!reportReason || reporting) return;
    setReporting(true);
    const res = await fetch(`/api/users/${params.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    const data = await res.json();
    if (res.ok) {
      setReportDone(true);
      setShowReport(false);
      toast.success("檢舉已送出，感謝你的回報！");
    } else {
      toast.error(data.error ?? "送出失敗");
    }
    setReporting(false);
  }

  async function toggleFollow() {
    if (!currentUser) { router.push("/auth/login"); return; }
    setFollowLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${params.id}/follow`, { method });
    if (res.ok) {
      setIsFollowing(!isFollowing);
      setFollowerCount(c => isFollowing ? c - 1 : c + 1);
    }
    setFollowLoading(false);
  }

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
            <div className="flex gap-5 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{collection.length}</div>
                <div className="text-xs text-gray-500">收藏</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{posts.length}</div>
                <div className="text-xs text-gray-500">貼文</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{followerCount}</div>
                <div className="text-xs text-gray-500">粉絲</div>
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

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {currentUser && (
            <>
              <button onClick={startConversation} disabled={startingConv}
                className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50">
                <Mail className="w-4 h-4" /> {startingConv ? "開啟中..." : "傳送訊息"}
              </button>
              <button onClick={toggleFollow} disabled={followLoading}
                className={cn("flex-1 text-sm py-2 rounded-xl font-semibold border transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                  isFollowing
                    ? "bg-white/5 border-white/10 text-gray-300 hover:bg-red-900/10 hover:text-red-400 hover:border-red-800/30"
                    : "bg-brand-600/20 border-brand-700/30 text-brand-400 hover:bg-brand-600/30"
                )}>
                {isFollowing ? <><UserCheck className="w-4 h-4" /> 已追蹤</> : <><UserPlus className="w-4 h-4" /> 追蹤</>}
              </button>
            </>
          )}
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("連結已複製！"); }}
            className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> 分享
          </button>
        </div>

        {/* Block / Report (logged-in users only) */}
        {currentUser && (
          <div className="flex gap-2">
            <button
              onClick={toggleBlock}
              disabled={blockLoading}
              className={`flex-1 text-xs py-2 rounded-xl border transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                isBlocked
                  ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  : "bg-orange-900/10 border-orange-800/20 text-orange-400 hover:bg-orange-900/20"
              }`}
            >
              <ShieldOff className="w-3.5 h-3.5" />
              {isBlocked ? "已封鎖（點擊解除）" : "封鎖此用戶"}
            </button>
            {!reportDone ? (
              <button
                onClick={() => setShowReport(true)}
                className="flex-1 text-xs py-2 rounded-xl border bg-red-900/10 border-red-800/20 text-red-400 hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" /> 檢舉用戶
              </button>
            ) : (
              <div className="flex-1 text-xs py-2 rounded-xl border bg-gray-800/20 border-gray-700/20 text-gray-500 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> 已提交檢舉
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-t border-white/10 flex">
        {([
          ["collection", <Grid3X3 className="w-5 h-5" />, "收藏"],
          ["posts", <Star className="w-5 h-5" />, "貼文"],
          ["trade", <ArrowLeftRight className="w-5 h-5" />, "換卡"],
          ["reviews", <ThumbsUp className="w-5 h-5" />, "評價"],
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
                      {item.cards?.rarity && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${rarityColor(item.cards.rarity)}`}>
                          {item.cards.rarity}
                        </span>
                      )}
                    </div>
                    {item.quantity > 1 && (
                      <div className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ×{item.quantity}
                      </div>
                    )}
                  </>
                );
                const cls = "relative aspect-square bg-gray-900 overflow-hidden group";
                const href = item.card_id ? `/cards/${item.card_id}` : `/collection/${item.id}`;
                return <Link key={item.id} href={href} className={cls}>{inner}</Link>;
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

      {/* Reviews Tab */}
      {tab === "reviews" && (
        <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
          {/* Stats summary */}
          {reviewStats.total > 0 ? (
            <>
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">交易評價</h2>
                  <span className="text-xs text-gray-500">{reviewStats.total} 筆評價</span>
                </div>
                {/* Bar */}
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {reviewStats.positive > 0 && (
                    <div className="bg-green-500 rounded-full" style={{ width: `${(reviewStats.positive / reviewStats.total) * 100}%` }} />
                  )}
                  {reviewStats.neutral > 0 && (
                    <div className="bg-gray-500 rounded-full" style={{ width: `${(reviewStats.neutral / reviewStats.total) * 100}%` }} />
                  )}
                  {reviewStats.negative > 0 && (
                    <div className="bg-red-500 rounded-full" style={{ width: `${(reviewStats.negative / reviewStats.total) * 100}%` }} />
                  )}
                </div>
                {/* Counts */}
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1 text-green-400">
                    <ThumbsUp className="w-3.5 h-3.5" /> 好評 {reviewStats.positive}
                  </span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Minus className="w-3.5 h-3.5" /> 中評 {reviewStats.neutral}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <ThumbsDown className="w-3.5 h-3.5" /> 差評 {reviewStats.negative}
                  </span>
                </div>
              </div>

              {/* Review list */}
              <div className="space-y-2">
                {reviews.map(rv => {
                  const isPositive = rv.rating === "positive";
                  const isNegative = rv.rating === "negative";
                  return (
                    <div key={rv.id} className="glass rounded-xl p-4 flex gap-3">
                      <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        isPositive ? "bg-green-500/20 text-green-400" :
                        isNegative ? "bg-red-500/20 text-red-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>
                        {isPositive ? <ThumbsUp className="w-3.5 h-3.5" /> :
                         isNegative ? <ThumbsDown className="w-3.5 h-3.5" /> :
                         <Minus className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Link href={`/users/${rv.reviewer?.id}`}
                            className="text-sm font-medium text-gray-200 hover:text-white transition-colors truncate">
                            {rv.reviewer?.display_name ?? rv.reviewer?.username ?? "用戶"}
                          </Link>
                          <span className="text-xs text-gray-600 shrink-0">
                            {timeAgo(new Date(rv.created_at))}
                          </span>
                        </div>
                        {rv.comment ? (
                          <p className="text-sm text-gray-400 leading-relaxed">{rv.comment}</p>
                        ) : (
                          <p className="text-xs text-gray-600 italic">無留言</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-500 space-y-2">
              <ThumbsUp className="w-10 h-10 mx-auto opacity-30" />
              <p>還沒有交易評價</p>
            </div>
          )}
        </div>
      )}

      <div className="h-16" />

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" /> 檢舉用戶
              </h3>
              <button onClick={() => setShowReport(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">請選擇檢舉原因，我們會盡快處理。</p>

            <div className="space-y-2">
              {["詐騙/欺騙交易", "騷擾或霸凌", "冒充他人", "散播不實資訊", "其他"].map(r => (
                <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reportReason === r}
                    onChange={() => setReportReason(r)}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-gray-300">{r}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowReport(false)} className="flex-1 btn-secondary text-sm py-2">
                取消
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason || reporting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm py-2 rounded-xl font-medium transition-colors"
              >
                {reporting ? "送出中..." : "送出檢舉"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
