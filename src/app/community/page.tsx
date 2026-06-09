"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PenLine, MessageSquare, Eye, TrendingUp, Flame, Clock, Award, X, Send } from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const sortTabs = [
  { id: "hot", label: "熱門", icon: Flame },
  { id: "new", label: "最新", icon: Clock },
  { id: "top", label: "精選", icon: Award },
];

const boards = [
  { id: "all", label: "全部", icon: "🃏" },
  { id: "mtg", label: "MTG", icon: "⚔️" },
  { id: "pokemon", label: "寶可夢", icon: "⚡" },
  { id: "yugioh", label: "遊戲王", icon: "🌀" },
  { id: "nba", label: "NBA", icon: "🏀" },
  { id: "mlb", label: "MLB", icon: "⚾" },
];

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

interface Post {
  id: string; title: string; content: string; board: string; post_type: string;
  upvotes: number; view_count: number; created_at: string;
  profiles: { username: string; avatar_url: string | null; reputation: number } | null;
  comment_count?: number;
}

export default function CommunityPage() {
  const [activeBoard, setActiveBoard] = useState("all");
  const [activeSort, setActiveSort] = useState("new");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newPost, setNewPost] = useState({ title: "", content: "", board: "general", post_type: "discussion" });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let url = "/api/posts?limit=30";
    if (activeBoard !== "all") url += `&board=${activeBoard}`;
    const res = await fetch(url);
    if (res.ok) {
      const { posts } = await res.json();
      let sorted = [...(posts ?? [])];
      if (activeSort === "hot") sorted.sort((a: Post, b: Post) => b.upvotes - a.upvotes);
      if (activeSort === "top") sorted.sort((a: Post, b: Post) => (b.upvotes + b.view_count) - (a.upvotes + a.view_count));
      setPosts(sorted);
    }
    setLoading(false);
  }, [activeBoard, activeSort]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { alert("請先登入"); return; }
    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    });
    if (res.ok) {
      setShowNewPost(false);
      setNewPost({ title: "", content: "", board: "general", post_type: "discussion" });
      fetchPosts();
    } else {
      const { error } = await res.json();
      alert(error ?? "發文失敗");
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
                  placeholder="分享你的想法..." required rows={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">版塊選擇</h3>
            <ul className="space-y-1">
              {boards.map(board => (
                <li key={board.id}>
                  <button onClick={() => setActiveBoard(board.id)}
                    className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors font-medium",
                      activeBoard === board.id ? "bg-brand-600/20 text-brand-300" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}>
                    <span>{board.icon}</span> {board.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">發文規則</h3>
            <ul className="text-xs text-gray-500 space-y-1.5">
              {["請選擇正確板塊發文","標題清楚描述內容","價格詢問請附圖片","尊重其他收藏家","禁止廣告或詐騙行為"].map((r, i) => (
                <li key={i} className="flex gap-1.5"><span className="text-brand-500">{i+1}.</span>{r}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">社群討論</h1>
              <p className="text-sm text-gray-500 mt-0.5">{boards.find(b => b.id === activeBoard)?.label ?? "全部"} 板</p>
            </div>
            <button onClick={() => user ? setShowNewPost(true) : window.location.href = "/auth/login"}
              className="btn-primary flex items-center gap-2 shrink-0 text-sm">
              <PenLine className="w-4 h-4" /> 發文
            </button>
          </div>

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
            {loading ? (
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
                  <p className="text-sm text-gray-500 line-clamp-1">{post.content}</p>
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
    </div>
  );
}
