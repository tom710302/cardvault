"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PenLine, MessageSquare, Eye, TrendingUp, Flame, Clock, Award,
  X, Send, ImageIcon, Grid3X3, Trophy, Package, Users, ChevronDown,
} from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";

// Strip [text](url) markdown so list previews show clean text
function stripMarkdown(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface Post {
  id: string; title: string; content: string; board: string; post_type: string;
  upvotes: number; view_count: number; created_at: string;
  image_urls?: string[] | null;
  profiles: { username: string; avatar_url: string | null; reputation: number } | null;
}
interface ShowcaseUser {
  id: string; username: string; display_name: string | null;
  reputation: number; avatar_url: string | null;
  collection_count: number; trade_tier: string; is_featured: boolean;
  preview_images: string[];
}

const sortTabs = [
  { id: "hot", label: "熱門", icon: Flame },
  { id: "new", label: "最新", icon: Clock },
  { id: "top", label: "精選", icon: Award },
];
const cardBoards = [
  { id: "mtg", label: "MTG", icon: "⚔️" },
  { id: "pokemon", label: "寶可夢", icon: "⚡" },
  { id: "yugioh", label: "遊戲王", icon: "🌀" },
  { id: "nba", label: "NBA", icon: "🏀" },
  { id: "mlb", label: "MLB", icon: "⚾" },
];

// used only in new-post form (no store — that board is auto-only)
const boards = cardBoards;
const postTypes = [
  { value: "discussion", label: "🗣️ 討論" },
  { value: "showcase", label: "📸 展示" },
  { value: "price_check", label: "💰 價格詢問" },
  { value: "news", label: "📰 資訊" },
];
const typeColor: Record<string, string> = {
  discussion: "text-blue-400 bg-blue-900/30",
  showcase: "text-purple-400 bg-purple-900/30",
  price_check: "text-yellow-400 bg-yellow-900/30",
  news: "text-green-400 bg-green-900/30",
};
const typeLabel: Record<string, string> = {
  discussion: "🗣️ 討論", showcase: "📸 展示", price_check: "💰 價格詢問", news: "📰 資訊",
};
const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

function CommunityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "discussion";
  const supabase = createClient();

  // Shared
  const [user, setUser] = useState<any>(null);
  const [communityRules, setCommunityRules] = useState<string[]>([
    "請選擇正確板塊發文", "標題清楚描述內容", "價格詢問請附圖片", "尊重其他收藏家", "禁止廣告或詐騙行為",
  ]);

  // Discussion tab
  const [activeBoard, setActiveBoard] = useState("all");
  const [cardBoardsOpen, setCardBoardsOpen] = useState(false);
  const [activeSort, setActiveSort] = useState("new");
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", board: "general", post_type: "discussion" });
  const [postImages, setPostImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Showcase tab
  const [showcaseFilter, setShowcaseFilter] = useState("all");
  const [showcaseUsers, setShowcaseUsers] = useState<ShowcaseUser[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetch("/api/settings?key=community_rules")
      .then(r => r.json())
      .then(({ value }) => { if (Array.isArray(value) && value.length > 0) setCommunityRules(value); })
      .catch(() => {});
  }, []);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    // "cards" is a virtual board: all posts except store
    const boardParam = activeBoard === "all" || activeBoard === "cards" ? "" : `&board=${activeBoard}`;
    const res = await fetch(`/api/posts?limit=50${boardParam}`);
    if (res.ok) {
      const { posts } = await res.json();
      let sorted: Post[] = [...(posts ?? [])];
      if (activeBoard === "cards") sorted = sorted.filter(p => p.board !== "store");
      if (activeSort === "hot") sorted.sort((a, b) => b.upvotes - a.upvotes);
      if (activeSort === "top") sorted.sort((a, b) => (b.upvotes + b.view_count) - (a.upvotes + a.view_count));
      setPosts(sorted);
    }
    setPostsLoading(false);
  }, [activeBoard, activeSort]);

  useEffect(() => {
    if (tab === "discussion") { const t = setTimeout(fetchPosts, 300); return () => clearTimeout(t); }
  }, [tab, fetchPosts]);

  useEffect(() => {
    if (tab !== "showcase") return;
    setShowcaseLoading(true);
    fetch("/api/community/showcase")
      .then(r => r.json())
      .then(({ users }) => { setShowcaseUsers(users ?? []); })
      .catch(() => {})
      .finally(() => setShowcaseLoading(false));
  }, [tab]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { alert("請先登入"); return; }
    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newPost, image_urls: postImages }),
    });
    if (res.ok) {
      setShowNewPost(false);
      setNewPost({ title: "", content: "", board: "general", post_type: "discussion" });
      setPostImages([]);
      fetchPosts();
    } else {
      const { error } = await res.json();
      alert(error ?? "發文失敗");
    }
    setSubmitting(false);
  }

  const filteredShowcaseUsers = showcaseFilter === "top"
    ? showcaseUsers.filter(u => u.is_featured)
    : showcaseUsers;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">發表新文章</h2>
              <button onClick={() => setShowNewPost(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitPost} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">版塊</label>
                  <select value={newPost.board} onChange={e => setNewPost(v => ({ ...v, board: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {boards.filter(b => b.id !== "all").map(b => (
                      <option key={b.id} value={b.id}>{b.icon} {b.label}</option>
                    ))}
                    <option value="general">🌐 一般</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">類型</label>
                  <select value={newPost.post_type} onChange={e => setNewPost(v => ({ ...v, post_type: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {postTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">標題</label>
                <input value={newPost.title} onChange={e => setNewPost(v => ({ ...v, title: e.target.value }))}
                  placeholder="輸入文章標題..." required maxLength={100}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">內容</label>
                <textarea value={newPost.content} onChange={e => setNewPost(v => ({ ...v, content: e.target.value }))}
                  placeholder="分享你的想法..." required rows={5}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> 附圖（最多 4 張，選填）
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {postImages.map((url, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-video">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPostImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {postImages.length < 4 && (
                    <ImageUpload folder="posts" label="點擊上傳圖片" hint="JPG、PNG，最大 5MB"
                      className="aspect-video" onUpload={url => setPostImages(prev => [...prev, url])} />
                  )}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowNewPost(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={submitting}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {submitting ? "發表中..." : "發表文章"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">社群討論</h1>
          <p className="text-gray-400 text-sm mt-1">分享想法、展示收藏，一起交流</p>
        </div>
        {tab === "discussion" && (
          <button onClick={() => user ? setShowNewPost(true) : router.push("/auth/login")}
            className="btn-primary flex items-center gap-2 shrink-0 text-sm">
            <PenLine className="w-4 h-4" /> 發文
          </button>
        )}
        {tab === "showcase" && user && (
          <Link href="/collection" className="btn-primary flex items-center gap-2 shrink-0 text-sm">
            <Package className="w-4 h-4" /> 管理我的收藏
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {[
          { id: "discussion", label: "💬 討論區" },
          { id: "showcase", label: "✨ 收藏展示" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => router.replace(`/community?tab=${id}`)}
            className={cn("px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Discussion Tab ── */}
      {tab === "discussion" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">版塊選擇</h3>
              <ul className="space-y-1">
                {/* 卡牌討論 accordion */}
                <li>
                  <button
                    onClick={() => {
                      const opening = !cardBoardsOpen;
                      setCardBoardsOpen(opening);
                      if (opening && activeBoard !== "cards" && !cardBoards.some(b => b.id === activeBoard)) {
                        setActiveBoard("cards");
                      }
                    }}
                    className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      (activeBoard === "cards" || cardBoards.some(b => b.id === activeBoard))
                        ? "bg-brand-600/20 text-brand-300"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}>
                    <span>🃏</span>
                    <span className="flex-1 text-left">話題討論</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", cardBoardsOpen && "rotate-180")} />
                  </button>

                  {cardBoardsOpen && (
                    <ul className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                      {cardBoards.map(board => (
                        <li key={board.id}>
                          <button onClick={() => setActiveBoard(board.id)}
                            className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                              activeBoard === board.id ? "text-brand-300 bg-brand-600/10" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                            )}>
                            <span>{board.icon}</span> {board.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>

                {/* 店家公告 */}
                <li>
                  <button onClick={() => { setActiveBoard("store"); setCardBoardsOpen(false); }}
                    className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeBoard === "store" ? "bg-brand-600/20 text-brand-300" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}>
                    <span>🏪</span> 店家公告
                  </button>
                </li>
              </ul>
            </div>
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">發文規則</h3>
              <ul className="text-xs text-gray-500 space-y-1.5">
                {communityRules.map((r, i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-brand-500">{i + 1}.</span>{r}</li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex gap-2 border-b border-white/10">
              {sortTabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveSort(id)}
                  className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                    activeSort === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"
                  )}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              {postsLoading ? (
                Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 shimmer" />)
              ) : posts.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>還沒有文章，來發第一篇吧！</p>
                  <button onClick={() => setShowNewPost(true)} className="btn-primary mt-3 text-sm">發文</button>
                </div>
              ) : posts.map(post => (
                <Link href={`/community/${post.id}`} key={post.id}
                  className="glass rounded-xl p-4 flex gap-4 card-hover group block">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-1 min-w-[36px]">
                    <span className="text-gray-600 text-lg leading-none">▲</span>
                    <span className="text-sm font-bold text-gray-300">{post.upvotes}</span>
                    <span className="text-gray-600 text-lg leading-none">▼</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-xs ${typeColor[post.post_type] ?? "text-gray-400 bg-gray-800"}`}>
                        {typeLabel[post.post_type]}
                      </span>
                      <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
                    </div>
                    <h2 className="font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug">{post.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-1">{stripMarkdown(post.content)}</p>
                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className="flex gap-1.5 mt-1">
                        {post.image_urls.slice(0, 3).map((url, i) => (
                          <div key={i} className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {post.image_urls.length > 3 && (
                          <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-400 shrink-0 border border-white/10">
                            +{post.image_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                          {post.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                        </span>
                        <span className="text-gray-400">{post.profiles?.username ?? "用戶"}</span>
                      </span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 留言</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.view_count}</span>
                      <span>{timeAgo(new Date(post.created_at))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {posts.length > 0 && (
              <button onClick={fetchPosts} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" /> 重新載入
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Showcase Tab ── */}
      {tab === "showcase" && (
        <div className="space-y-5">
          {/* Filter */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2">
              {[
                { id: "all", label: "全部收藏家" },
                { id: "top", label: "⭐ 精選收藏家" },
              ].map(f => (
                <button key={f.id} onClick={() => setShowcaseFilter(f.id)}
                  className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                    showcaseFilter === f.id ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">{filteredShowcaseUsers.length} 位收藏家公開了他們的收藏</p>
          </div>

          {/* 精選說明 */}
          {showcaseFilter === "top" && (
            <div className="glass rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-gray-500">
              <span className="text-yellow-400 text-base shrink-0">⭐</span>
              <span>
                滿足以下任一條件即可<span className="text-yellow-400 font-medium">自動</span>獲得精選：
                公開收藏 ≥ 5 張，或換卡等級達到
                <span className="text-yellow-400"> ⭐ 收藏家</span>（完成 10 次換卡）以上
              </span>
            </div>
          )}

          {showcaseLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-56 shimmer" />)}
            </div>
          ) : filteredShowcaseUsers.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-3">
              <Package className="w-12 h-12 mx-auto opacity-30" />
              <p>{showcaseFilter === "top" ? "目前還沒有精選收藏家" : "還沒有收藏家公開他們的收藏"}</p>
              {showcaseFilter === "top"
                ? <p className="text-xs text-gray-600">公開收藏 5 張以上，或完成 10 次換卡即可加入</p>
                : user
                  ? <Link href="/collection" className="btn-primary text-sm inline-flex gap-2"><Package className="w-4 h-4" /> 新增我的收藏</Link>
                  : <Link href="/auth/login" className="btn-secondary text-sm inline-flex">登入後新增收藏</Link>
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShowcaseUsers.map(u => (
                <Link key={u.id} href={`/users/${u.id}`}
                  className="glass rounded-2xl overflow-hidden card-hover group block">
                  {/* Card preview strip */}
                  <div className="relative grid grid-cols-4 h-28 bg-gray-900">
                    {u.preview_images.slice(0, 4).map((img, i) => (
                      <div key={i} className="overflow-hidden bg-gray-800">
                        <img src={img} alt=""
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    ))}
                    {Array(Math.max(0, 4 - u.preview_images.length)).fill(0).map((_, i) => (
                      <div key={`e-${i}`} className="bg-gray-900 flex items-center justify-center text-gray-800 border-l border-gray-800">
                        <Grid3X3 className="w-4 h-4" />
                      </div>
                    ))}
                    {/* 精選徽章 */}
                    {u.is_featured && (
                      <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/80 text-yellow-400 border border-yellow-700/50 backdrop-blur-sm font-medium">
                        ⭐ 精選
                      </div>
                    )}
                  </div>
                  {/* User info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                          : u.username[0]?.toUpperCase()
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm truncate group-hover:text-brand-300 transition-colors">
                            {u.display_name ?? u.username}
                          </span>
                          {(u.trade_tier === "收藏家" || u.trade_tier === "卡牌大師") && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                              u.trade_tier === "卡牌大師"
                                ? "bg-orange-900/30 text-orange-400 border-orange-800/30"
                                : "bg-yellow-900/30 text-yellow-400 border-yellow-800/30"
                            }`}>
                              {u.trade_tier === "卡牌大師" ? "👑" : "⭐"} {u.trade_tier}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t border-white/5">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> {u.collection_count} 張收藏
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> {u.reputation} 聲望
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense>
      <CommunityContent />
    </Suspense>
  );
}
