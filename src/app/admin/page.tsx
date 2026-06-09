"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, FileText, Database, Package, TrendingUp, Shield, Eye, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Stats { users: number; posts: number; cards: number; collections: number; }
interface Post { id: string; title: string; board: string; post_type: string; is_deleted: boolean; created_at: string; profiles: { username: string } | null; }
interface User { id: string; username: string; display_name: string; role: string; reputation: number; is_banned: boolean; created_at: string; }

export default function AdminPage() {
  const [tab, setTab] = useState<"dashboard" | "posts" | "users" | "cards">("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
    fetchPosts();
    fetchUsers();
  }, []);

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }

  async function fetchPosts() {
    const { data } = await supabase.from("posts").select("*, profiles(username)").order("created_at", { ascending: false }).limit(50);
    if (data) setPosts(data as Post[]);
  }

  async function fetchUsers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setUsers(data as User[]);
  }

  async function deletePost(id: string) {
    if (!confirm("確定刪除這篇文章？")) return;
    await supabase.from("posts").update({ is_deleted: true }).eq("id", id);
    fetchPosts();
  }

  async function toggleBan(id: string, banned: boolean) {
    await supabase.from("profiles").update({ is_banned: !banned }).eq("id", id);
    fetchUsers();
  }

  async function setRole(id: string, role: string) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    fetchUsers();
  }

  const typeColor: Record<string, string> = {
    discussion: "text-blue-400 bg-blue-900/30",
    showcase: "text-purple-400 bg-purple-900/30",
    price_check: "text-yellow-400 bg-yellow-900/30",
    news: "text-green-400 bg-green-900/30",
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Admin Header */}
      <div className="bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white">CardSearch 後台管理</span>
            <span className="ml-2 text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">Admin</span>
          </div>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">← 回到網站</Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {([["dashboard", "📊 儀表板"], ["posts", "📝 文章管理"], ["users", "👥 用戶管理"], ["cards", "🃏 卡牌管理"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? (
                Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl p-5 h-24 shimmer" />)
              ) : [
                { label: "總用戶數", value: stats?.users ?? 0, icon: Users, color: "text-blue-400" },
                { label: "總文章數", value: stats?.posts ?? 0, icon: FileText, color: "text-green-400" },
                { label: "卡牌資料", value: stats?.cards ?? 0, icon: Database, color: "text-purple-400" },
                { label: "收藏紀錄", value: stats?.collections ?? 0, icon: Package, color: "text-yellow-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass rounded-xl p-5">
                  <div className={`flex items-center gap-2 mb-2 ${color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" /> 最新文章（前5篇）
              </h3>
              <div className="space-y-2">
                {posts.slice(0, 5).map(post => (
                  <div key={post.id} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`badge text-xs ${typeColor[post.post_type] ?? "text-gray-400 bg-gray-800"}`}>{post.post_type}</span>
                      <span className="text-gray-200 truncate">{post.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 shrink-0">
                      <span>{post.profiles?.username}</span>
                      <button onClick={() => deletePost(post.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Posts Management */}
        {tab === "posts" && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">文章管理（{posts.length} 篇）</h3>
            </div>
            <div className="divide-y divide-white/5">
              {posts.map(post => (
                <div key={post.id} className={`p-4 flex items-start gap-3 ${post.is_deleted ? "opacity-40" : ""}`}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${typeColor[post.post_type] ?? "text-gray-400 bg-gray-800"}`}>{post.post_type}</span>
                      <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
                    </div>
                    <p className="text-sm text-gray-200 truncate">{post.title}</p>
                    <p className="text-xs text-gray-500">by {post.profiles?.username} · {new Date(post.created_at).toLocaleDateString("zh-TW")}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {post.is_deleted ? (
                      <span className="text-xs text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3" /> 已刪除</span>
                    ) : (
                      <button onClick={() => deletePost(post.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded transition-colors">
                        <Trash2 className="w-3 h-3" /> 刪除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Management */}
        {tab === "users" && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">用戶管理（{users.length} 位）</h3>
            </div>
            <div className="divide-y divide-white/5">
              {users.map(user => (
                <div key={user.id} className={`p-4 flex items-center gap-3 ${user.is_banned ? "opacity-50" : ""}`}>
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {user.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{user.username}</span>
                      <span className={`badge text-xs ${user.role === "admin" ? "text-red-400 bg-red-900/30" : user.role === "moderator" ? "text-yellow-400 bg-yellow-900/30" : "text-gray-400 bg-gray-800"}`}>
                        {user.role}
                      </span>
                      {user.is_banned && <span className="badge text-xs text-red-400 bg-red-900/30">已封禁</span>}
                    </div>
                    <p className="text-xs text-gray-500">{user.reputation} 聲望 · {new Date(user.created_at).toLocaleDateString("zh-TW")} 加入</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <select value={user.role} onChange={e => setRole(user.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 px-2 py-1">
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                    <button onClick={() => toggleBan(user.id, user.is_banned)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${user.is_banned ? "text-green-400 hover:text-green-300 bg-green-900/20" : "text-red-400 hover:text-red-300 bg-red-900/20"}`}>
                      {user.is_banned ? <><CheckCircle className="w-3 h-3" /> 解封</> : <><Shield className="w-3 h-3" /> 封禁</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards Management */}
        {tab === "cards" && (
          <div className="glass rounded-xl p-6 text-center text-gray-500">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>卡牌資料已透過 SQL 匯入</p>
            <p className="text-sm mt-1">前往 Supabase → Table Editor → cards 進行管理</p>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-brand-400 hover:text-brand-300 text-sm">
              <Eye className="w-4 h-4" /> 開啟 Supabase Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
