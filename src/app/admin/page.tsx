"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, FileText, Database, Package, TrendingUp, Shield, Trash2, CheckCircle, Plus, X, MapPin, Navigation, Calendar, RefreshCw } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

interface Stats { users: number; posts: number; cards: number; collections: number; }
interface Post { id: string; title: string; board: string; post_type: string; is_deleted: boolean; created_at: string; profiles: { username: string } | null; }
interface User { id: string; username: string; display_name: string; role: string; reputation: number; is_banned: boolean; created_at: string; }
interface Card { id: string; name: string; game: string; card_type: string; rarity: string | null; is_active: boolean; created_at: string; }

export default function AdminPage() {
  const [tab, setTab] = useState<"dashboard" | "posts" | "users" | "cards" | "stores" | "events" | "content" | "banners" | "reports">("dashboard");
  const [storeSubTab, setStoreSubTab] = useState<"list" | "accounts">("list");
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<"pending" | "approved">("pending");
  const [syncing, setSyncing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [storeAccountForm, setStoreAccountForm] = useState({ email: "", password: "", username: "", store_id: "" });
  const [storeAccountSubmitting, setStoreAccountSubmitting] = useState(false);
  const [storeAccounts, setStoreAccounts] = useState<any[]>([]);
  const [storeForm, setStoreForm] = useState({ name: "", address: "", city: "台北市", phone: "", website: "", hours: "", description: "", image_url: "", games: [] as string[] });
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [communityRules, setCommunityRules] = useState<string[]>([]);
  const [savingRules, setSavingRules] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({ name: "", name_en: "", game: "MTG", card_type: "tcg", set_name: "", rarity: "", description: "" });
  const [cardSubmitting, setCardSubmitting] = useState(false);
  // Banner management state
  const [adminBanners, setAdminBanners] = useState<any[]>([]);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({ badge: "", headline: "", accent: "", description: "", cta1_label: "了解更多", cta1_href: "/", cta2_label: "", cta2_href: "", theme: "platform", art_type: "platform", is_active: true, sort_order: 0 });
  const toast = useToast();

  const supabase = createClient();

  useEffect(() => {
    if (tab === "banners") fetchAdminBanners();
    if (tab === "reports") fetchReports();
  }, [tab]);

  async function fetchReports() {
    setReportsLoading(true);
    const res = await fetch("/api/admin/reports");
    if (res.ok) { const { reports } = await res.json(); setReports(reports); }
    setReportsLoading(false);
  }

  async function handleReport(id: string, action: string, postId?: string) {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, post_id: postId }),
    });
    fetchReports();
    if (action === "delete_post") { toast.success("已刪除貼文並標記檢舉為已解決"); fetchPosts(); }
    else toast.success("已駁回檢舉");
  }

  useEffect(() => {
    fetchStats();
    fetchPosts();
    fetchUsers();
    fetchCards();
    fetchStores();
    fetchStoreAccounts();
    fetchEvents("pending");
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

  async function fetchCards() {
    const { data } = await supabase.from("cards").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setCards(data as Card[]);
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    setCardSubmitting(true);
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardForm),
    });
    if (res.ok) {
      setShowAddCard(false);
      setCardForm({ name: "", name_en: "", game: "MTG", card_type: "tcg", set_name: "", rarity: "", description: "" });
      fetchCards();
      fetchStats();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "新增失敗");
    }
    setCardSubmitting(false);
  }

  async function toggleCardActive(id: string, active: boolean) {
    await supabase.from("cards").update({ is_active: !active }).eq("id", id);
    fetchCards();
  }

  async function fetchStores() {
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    if (data) setStores(data);
  }

  async function addStore(e: React.FormEvent) {
    e.preventDefault();
    setStoreSubmitting(true);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...storeForm, is_verified: true }),
    });
    if (res.ok) {
      setShowAddStore(false);
      setStoreForm({ name: "", address: "", city: "台北市", phone: "", website: "", hours: "", description: "", image_url: "", games: [] });
      fetchStores();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "新增失敗");
    }
    setStoreSubmitting(false);
  }

  async function toggleVerify(id: string, verified: boolean) {
    await fetch("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_verified: !verified }),
    });
    fetchStores();
  }

  async function deleteStore(id: string) {
    if (!confirm("確定刪除此店舖？")) return;
    await supabase.from("stores").delete().eq("id", id);
    fetchStores();
  }

  async function fetchStoreAccounts() {
    const { data } = await supabase.from("profiles").select("id, username, email:id, role, store_id, stores(name)").eq("role", "store_owner");
    if (data) setStoreAccounts(data);
  }

  async function createStoreAccount(e: React.FormEvent) {
    e.preventDefault();
    setStoreAccountSubmitting(true);
    const res = await fetch("/api/admin/create-store-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storeAccountForm),
    });
    if (res.ok) {
      toast.success(`店主帳號建立成功！\nEmail: ${storeAccountForm.email}\n密碼: ${storeAccountForm.password}`, 0);
      setStoreAccountForm({ email: "", password: "", username: "", store_id: "" });
      fetchStoreAccounts();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "建立失敗");
    }
    setStoreAccountSubmitting(false);
  }

  async function revokeStoreAccount(id: string) {
    if (!confirm("確定撤銷此店主權限？")) return;
    await supabase.from("profiles").update({ role: "user", store_id: null }).eq("id", id);
    fetchStoreAccounts();
  }

  function toggleStoreGame(g: string) {
    setStoreForm(v => ({
      ...v,
      games: v.games.includes(g) ? v.games.filter(x => x !== g) : [...v.games, g],
    }));
  }

  async function deletePost(id: string) {
    if (!confirm("確定刪除這篇文章？")) return;
    await supabase.from("posts").update({ is_deleted: true }).eq("id", id);
    fetchPosts();
  }

  async function fetchEvents(status: "pending" | "approved") {
    const { data } = await supabase.from("events")
      .select("*, profiles(username)")
      .eq("status", status)
      .order("start_date", { ascending: true })
      .limit(100);
    if (data) setEvents(data);
  }

  async function approveEvent(id: string) {
    await supabase.from("events").update({ status: "approved" }).eq("id", id);
    fetchEvents(eventFilter);
  }

  async function rejectEvent(id: string) {
    if (!confirm("確定拒絕並刪除此賽事？")) return;
    await supabase.from("events").delete().eq("id", id);
    fetchEvents(eventFilter);
  }

  async function syncPokemonEvents() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-events", { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        toast.success(`同步完成！新增 ${body.synced} 筆，更新 ${body.updated} 筆，錯誤 ${body.errors} 筆`);
        fetchEvents(eventFilter);
      } else {
        toast.error("同步失敗：" + (body.error ?? "未知錯誤"));
      }
    } catch {
      toast.error("網路錯誤");
    }
    setSyncing(false);
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

  // ── Banner helpers ────────────────────────────────────────────────────
  const BANNER_THEME_LABELS: Record<string, string> = { platform: "🔵 藍紫", trade: "🟢 綠青", collector: "🟡 琥珀橙", ad: "🟣 紫桃紅" };
  const BANNER_THEME_PREVIEW: Record<string, string> = { platform: "from-indigo-900 to-purple-900", trade: "from-emerald-900 to-cyan-900", collector: "from-amber-900 to-orange-900", ad: "from-violet-900 to-fuchsia-900" };
  const BANNER_ART_LABELS: Record<string, string> = { platform: "🃏 卡牌扇形", trade: "⇄ 換卡系統", collector: "👑 收藏家", ad: "📢 廣告位", none: "🚫 無裝飾" };

  async function fetchAdminBanners() {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setAdminBanners(data ?? []);
  }

  async function saveBanner() {
    const payload = { ...bannerForm };
    if (editingBannerId) {
      await fetch("/api/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingBannerId, ...payload }) });
    } else {
      await fetch("/api/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, sort_order: adminBanners.length }) });
    }
    setShowBannerForm(false);
    setEditingBannerId(null);
    fetchAdminBanners();
  }

  async function deleteBanner(id: string) {
    if (!confirm("確定刪除這個 Banner？")) return;
    await fetch("/api/banners", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchAdminBanners();
  }

  async function toggleBannerActive(banner: any) {
    await fetch("/api/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: banner.id, is_active: !banner.is_active }) });
    fetchAdminBanners();
  }

  async function moveBanner(idx: number, dir: number) {
    const next = [...adminBanners];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setAdminBanners(next);
    await Promise.all([
      fetch("/api/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: next[idx].id, sort_order: idx }) }),
      fetch("/api/banners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: next[target].id, sort_order: target }) }),
    ]);
  }
  // ── End Banner helpers ────────────────────────────────────────────────

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
          {([["dashboard", "📊 儀表板"], ["posts", "📝 文章管理"], ["users", "👥 用戶管理"], ["cards", "🃏 卡牌管理"], ["stores", "🏪 店舖管理"], ["events", "🏆 賽事管理"], ["content", "✍️ 文案編輯"], ["banners", "🖼️ Banner"], ["reports", "🚨 檢舉審核"]] as const).map(([id, label]) => (
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
          <div className="space-y-4">
            {showAddCard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">新增卡牌</h2>
                    <button onClick={() => setShowAddCard(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={addCard} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">卡牌名稱 *</label>
                        <input value={cardForm.name} onChange={e => setCardForm(v => ({ ...v, name: e.target.value }))} required
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">英文名稱</label>
                        <input value={cardForm.name_en} onChange={e => setCardForm(v => ({ ...v, name_en: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">遊戲 *</label>
                        <select value={cardForm.game} onChange={e => setCardForm(v => ({ ...v, game: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                          {["MTG", "寶可夢", "遊戲王", "NBA", "MLB", "NFL", "其他"].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">類型</label>
                        <select value={cardForm.card_type} onChange={e => setCardForm(v => ({ ...v, card_type: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                          <option value="tcg">TCG</option>
                          <option value="sports">運動卡</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">系列名稱</label>
                        <input value={cardForm.set_name} onChange={e => setCardForm(v => ({ ...v, set_name: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">稀有度</label>
                        <input value={cardForm.rarity} onChange={e => setCardForm(v => ({ ...v, rarity: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">描述</label>
                      <textarea value={cardForm.description} onChange={e => setCardForm(v => ({ ...v, description: e.target.value }))} rows={2}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button type="button" onClick={() => setShowAddCard(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                      <button type="submit" disabled={cardSubmitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                        {cardSubmitting ? "新增中..." : "新增卡牌"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-white">卡牌管理（{cards.length} 張）</h3>
                <button onClick={() => setShowAddCard(true)} className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5">
                  <Plus className="w-3.5 h-3.5" /> 新增卡牌
                </button>
              </div>
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {cards.map(card => (
                  <div key={card.id} className={`p-4 flex items-center gap-3 ${!card.is_active ? "opacity-40" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-200">{card.name}</span>
                        <span className="badge text-xs bg-gray-800 text-gray-400">{card.game}</span>
                        <span className="badge text-xs bg-gray-800 text-gray-400">{card.card_type}</span>
                      </div>
                      {card.rarity && <p className="text-xs text-gray-500 mt-0.5">{card.rarity}</p>}
                    </div>
                    <button onClick={() => toggleCardActive(card.id, card.is_active)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${card.is_active ? "text-red-400 hover:text-red-300 bg-red-900/20" : "text-green-400 hover:text-green-300 bg-green-900/20"}`}>
                      {card.is_active ? "下架" : "上架"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stores Management */}
        {tab === "stores" && (
          <div className="space-y-4">
            {/* Sub Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-0">
              {([["list", "🏪 店舖列表"], ["accounts", "🔑 店主帳號"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setStoreSubTab(id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${storeSubTab === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                  {label}
                </button>
              ))}
            </div>
            {showAddStore && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-brand-400" /> 新增店舖</h2>
                    <button onClick={() => setShowAddStore(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={addStore} className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">店舖名稱 *</label>
                      <input value={storeForm.name} onChange={e => setStoreForm(v => ({ ...v, name: e.target.value }))} required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">地址 *</label>
                        <input value={storeForm.address} onChange={e => setStoreForm(v => ({ ...v, address: e.target.value }))} required
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">城市 *</label>
                        <select value={storeForm.city} onChange={e => setStoreForm(v => ({ ...v, city: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                          {["台北市","新北市","桃園市","台中市","台南市","高雄市","其他"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">電話</label>
                        <input value={storeForm.phone} onChange={e => setStoreForm(v => ({ ...v, phone: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">網站</label>
                        <input value={storeForm.website} onChange={e => setStoreForm(v => ({ ...v, website: e.target.value }))}
                          placeholder="https://..."
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">營業時間</label>
                      <input value={storeForm.hours} onChange={e => setStoreForm(v => ({ ...v, hours: e.target.value }))}
                        placeholder="週一至週日 11:00-21:00"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">販售卡牌種類</label>
                      <div className="flex flex-wrap gap-2">
                        {["MTG","寶可夢","遊戲王","NBA","MLB","NFL","WS","其他"].map(g => (
                          <button key={g} type="button" onClick={() => toggleStoreGame(g)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${storeForm.games.includes(g) ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">店舖簡介</label>
                      <textarea value={storeForm.description} onChange={e => setStoreForm(v => ({ ...v, description: e.target.value }))} rows={2}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">店舖照片</label>
                      <ImageUpload folder="stores" label="上傳店舖照片" hint="JPG、PNG，最大 5MB"
                        currentUrl={storeForm.image_url} className="aspect-video"
                        onUpload={url => setStoreForm(v => ({ ...v, image_url: url }))}
                        onRemove={() => setStoreForm(v => ({ ...v, image_url: "" }))} />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button type="button" onClick={() => setShowAddStore(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                      <button type="submit" disabled={storeSubmitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                        {storeSubmitting ? "新增中..." : "新增店舖"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {storeSubTab === "list" && <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-400" /> 店舖列表（{stores.length} 間）
                </h3>
                <button onClick={() => setShowAddStore(true)} className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5">
                  <Plus className="w-3.5 h-3.5" /> 新增店舖
                </button>
              </div>
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {stores.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">還沒有店舖資料</div>
                ) : stores.map(store => (
                  <div key={store.id} className="p-4 flex items-start gap-3">
                    {store.image_url && (
                      <img src={store.image_url} alt={store.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-200">{store.name}</span>
                        <span className="badge text-xs bg-gray-800 text-gray-400">{store.city}</span>
                        {store.is_verified && <span className="badge text-xs text-green-400 bg-green-900/30">✓ 已驗證</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {store.address}
                      </p>
                      {store.games?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {store.games.map((g: string) => <span key={g} className="badge text-[10px] bg-gray-800 text-gray-400">{g}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name + " " + store.address)}`, "_blank")}
                        className="text-xs text-brand-400 hover:text-brand-300 bg-brand-900/20 px-2 py-1 rounded transition-colors">
                        地圖
                      </button>
                      <button onClick={() => toggleVerify(store.id, store.is_verified)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${store.is_verified ? "text-yellow-400 hover:text-yellow-300 bg-yellow-900/20" : "text-green-400 hover:text-green-300 bg-green-900/20"}`}>
                        {store.is_verified ? "取消驗證" : "驗證"}
                      </button>
                      <button onClick={() => deleteStore(store.id)}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {/* Store Accounts Sub Tab */}
            {storeSubTab === "accounts" && <div className="space-y-4">
              <div className="glass rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">🔑 建立店主帳號</h3>
                <p className="text-xs text-gray-500">建立後帳號可直接登入，在「我的店舖」後台管理商品與活動。</p>
                <form onSubmit={createStoreAccount} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">登入 Email *</label>
                      <input type="email" value={storeAccountForm.email} onChange={e => setStoreAccountForm(v => ({ ...v, email: e.target.value }))} required
                        placeholder="store@example.com"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">密碼 *</label>
                      <input type="text" value={storeAccountForm.password} onChange={e => setStoreAccountForm(v => ({ ...v, password: e.target.value }))} required
                        placeholder="至少 6 個字元"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">用戶名 *</label>
                      <input value={storeAccountForm.username} onChange={e => setStoreAccountForm(v => ({ ...v, username: e.target.value }))} required
                        placeholder="例如：arima_store"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">綁定店舖 *</label>
                      <select value={storeAccountForm.store_id} onChange={e => setStoreAccountForm(v => ({ ...v, store_id: e.target.value }))} required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                        <option value="">請選擇店舖</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={storeAccountSubmitting} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                    {storeAccountSubmitting ? "建立中..." : "🔑 建立店主帳號"}
                  </button>
                </form>
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">現有店主帳號（{storeAccounts.length}）</h3>
                </div>
                {storeAccounts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">還沒有店主帳號</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {storeAccounts.map(acc => (
                      <div key={acc.id} className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {acc.username?.[0]?.toUpperCase() ?? "S"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200">{acc.username}</span>
                            <span className="badge text-xs text-orange-400 bg-orange-900/30">店主</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">綁定店舖：{(acc as any).stores?.name ?? "未知"}</p>
                        </div>
                        <button onClick={() => revokeStoreAccount(acc.id)}
                          className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded transition-colors">
                          撤銷權限
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>}
          </div>
        )}
        {/* Events Management */}
        {tab === "events" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 border-b border-white/10">
                {([["pending", "⏳ 待審核"], ["approved", "✅ 已上線"]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => { setEventFilter(id); fetchEvents(id); }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${eventFilter === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={syncPokemonEvents} disabled={syncing}
                className="flex items-center gap-2 text-sm bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 border border-yellow-700/30">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "同步中..." : "⚡ 同步寶可夢官方賽事"}
              </button>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-400" />
                  {eventFilter === "pending" ? "待審核賽事" : "已上線賽事"}（{events.length}）
                </h3>
              </div>
              {events.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {eventFilter === "pending" ? "目前沒有待審核的賽事" : "還沒有上線的賽事"}
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {events.map(event => (
                    <div key={event.id} className="p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge text-xs bg-gray-800 text-gray-300">{event.game}</span>
                          <span className="badge text-xs bg-gray-800 text-gray-400">{event.event_type}</span>
                          {event.source === "official_pokemon" && (
                            <span className="badge text-xs text-yellow-400 bg-yellow-900/30">官方同步</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-200">{event.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> {event.start_date}
                          {event.start_time && ` ${event.start_time}`}
                          <MapPin className="w-3 h-3 ml-1" /> {event.venue_name}・{event.city}
                        </p>
                        {event.profiles && (
                          <p className="text-xs text-gray-600">回報者：{event.profiles.username}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {eventFilter === "pending" && (
                          <button onClick={() => approveEvent(event.id)}
                            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 bg-green-900/20 px-2 py-1 rounded transition-colors">
                            <CheckCircle className="w-3 h-3" /> 審核通過
                          </button>
                        )}
                        <button onClick={() => rejectEvent(event.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded transition-colors">
                          <Trash2 className="w-3 h-3" /> {eventFilter === "pending" ? "拒絕" : "刪除"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-4 flex items-start gap-3 text-sm text-gray-500">
              <span className="text-lg shrink-0">💡</span>
              <div>
                <p className="text-gray-300 font-medium mb-0.5">寶可夢官方賽事同步說明</p>
                <p>點擊「同步寶可夢官方賽事」從官網抓取近期賽事（前3頁），已存在的賽事會自動略過。Vercel 每天凌晨 2 點也會自動執行一次。</p>
              </div>
            </div>
          </div>
        )}

        {/* 文案編輯 */}
        {tab === "content" && (
          <div className="space-y-6 max-w-2xl">
            <ContentEditor
              title="社群討論 · 發文規則"
              description="顯示在社群討論側邊欄的發文規則列表"
              settingKey="community_rules"
              rules={communityRules}
              setRules={setCommunityRules}
              saving={savingRules}
              onSave={async () => {
                setSavingRules(true);
                await fetch("/api/admin/settings", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "community_rules", value: communityRules }),
                });
                setSavingRules(false);
              }}
              onLoad={async () => {
                const res = await fetch("/api/settings?key=community_rules");
                if (res.ok) {
                  const { value } = await res.json();
                  if (Array.isArray(value)) setCommunityRules(value);
                  else setCommunityRules(["請選擇正確板塊發文", "標題清楚描述內容", "價格詢問請附圖片", "尊重其他收藏家", "禁止廣告或詐騙行為"]);
                }
              }}
            />
          </div>
        )}

        {/* Banner Management */}
        {tab === "banners" && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">首頁 Banner 管理</h2>
                <p className="text-sm text-gray-500 mt-0.5">點選編輯可修改所有文字，↑↓ 調整順序</p>
              </div>
              <button onClick={() => {
                setBannerForm({ badge: "", headline: "", accent: "", description: "", cta1_label: "了解更多", cta1_href: "/", cta2_label: "", cta2_href: "", theme: "platform", art_type: "platform", is_active: true, sort_order: adminBanners.length });
                setEditingBannerId(null);
                setShowBannerForm(true);
              }} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> 新增 Banner
              </button>
            </div>

            {/* List */}
            <div className="space-y-3">
              {adminBanners.map((b, i) => (
                <div key={b.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className={`w-14 h-10 rounded-lg shrink-0 bg-gradient-to-br ${BANNER_THEME_PREVIEW[b.theme] ?? "from-gray-800 to-gray-900"} flex items-center justify-center text-lg`}>
                    {BANNER_ART_LABELS[b.art_type]?.split(" ")[0] ?? "🖼️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{b.headline} <span className="text-brand-400">{b.accent}</span></span>
                      {!b.is_active && <span className="text-[10px] text-gray-500 bg-gray-800 rounded px-1.5 py-0.5">停用</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{b.description}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{BANNER_THEME_LABELS[b.theme]} · {b.cta1_label} → {b.cta1_href}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveBanner(i, -1)} disabled={i === 0} title="上移" className="p-1.5 text-gray-500 hover:text-gray-200 disabled:opacity-20 transition-colors">↑</button>
                    <button onClick={() => moveBanner(i, 1)} disabled={i === adminBanners.length - 1} title="下移" className="p-1.5 text-gray-500 hover:text-gray-200 disabled:opacity-20 transition-colors">↓</button>
                    <button onClick={() => toggleBannerActive(b)} title={b.is_active ? "停用" : "啟用"}
                      className={`p-1.5 transition-colors ${b.is_active ? "text-green-400 hover:text-gray-400" : "text-gray-600 hover:text-green-400"}`}>
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      setBannerForm({ badge: b.badge ?? "", headline: b.headline, accent: b.accent, description: b.description ?? "", cta1_label: b.cta1_label, cta1_href: b.cta1_href, cta2_label: b.cta2_label ?? "", cta2_href: b.cta2_href ?? "", theme: b.theme, art_type: b.art_type, is_active: b.is_active, sort_order: b.sort_order });
                      setEditingBannerId(b.id);
                      setShowBannerForm(true);
                    }} className="p-1.5 text-brand-400 hover:text-brand-300 transition-colors text-sm">✏️</button>
                    <button onClick={() => deleteBanner(b.id)} className="p-1.5 text-red-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {adminBanners.length === 0 && (
                <div className="glass rounded-xl p-10 text-center text-gray-500 text-sm">還沒有 Banner，點上方「新增 Banner」建立第一個</div>
              )}
            </div>

            {/* Edit / Create Form */}
            {showBannerForm && (
              <div className="glass rounded-2xl p-6 space-y-4 border border-brand-500/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">{editingBannerId ? "✏️ 編輯 Banner" : "➕ 新增 Banner"}</h3>
                  <button onClick={() => setShowBannerForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">標籤徽章（可含 emoji，如：🔍 台灣最大...）</label>
                    <input value={bannerForm.badge} onChange={e => setBannerForm(v => ({ ...v, badge: e.target.value }))}
                      placeholder="🔍 台灣最大實體卡牌交流社群"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">主標題第一行（白色）</label>
                    <input value={bannerForm.headline} onChange={e => setBannerForm(v => ({ ...v, headline: e.target.value }))} required
                      placeholder="你的珍藏值得"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">主標題第二行（彩色漸層）</label>
                    <input value={bannerForm.accent} onChange={e => setBannerForm(v => ({ ...v, accent: e.target.value }))} required
                      placeholder="被世界看見"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">說明文字</label>
                    <textarea value={bannerForm.description} onChange={e => setBannerForm(v => ({ ...v, description: e.target.value }))} rows={2}
                      placeholder="集合 TCG 玩家與運動卡收藏家..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">主按鈕文字</label>
                    <input value={bannerForm.cta1_label} onChange={e => setBannerForm(v => ({ ...v, cta1_label: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">主按鈕連結</label>
                    <input value={bannerForm.cta1_href} onChange={e => setBannerForm(v => ({ ...v, cta1_href: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">次按鈕文字（空白則不顯示）</label>
                    <input value={bannerForm.cta2_label} onChange={e => setBannerForm(v => ({ ...v, cta2_label: e.target.value }))}
                      placeholder="探索店家"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">次按鈕連結</label>
                    <input value={bannerForm.cta2_href} onChange={e => setBannerForm(v => ({ ...v, cta2_href: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">配色主題</label>
                    <select value={bannerForm.theme} onChange={e => setBannerForm(v => ({ ...v, theme: e.target.value, art_type: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                      {Object.entries(BANNER_THEME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">裝飾圖案</label>
                    <select value={bannerForm.art_type} onChange={e => setBannerForm(v => ({ ...v, art_type: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                      {Object.entries(BANNER_ART_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-400">顯示狀態</label>
                    <button type="button" onClick={() => setBannerForm(v => ({ ...v, is_active: !v.is_active }))}
                      className={`text-sm px-3 py-1 rounded-full transition-colors ${bannerForm.is_active ? "bg-green-900/30 text-green-400 border border-green-800/50" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
                      {bannerForm.is_active ? "✓ 顯示中" : "✗ 已停用"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
                  <button onClick={() => { setShowBannerForm(false); setEditingBannerId(null); }} className="btn-secondary text-sm px-4 py-2">取消</button>
                  <button onClick={saveBanner} className="btn-primary text-sm px-4 py-2">
                    {editingBannerId ? "更新 Banner" : "新增 Banner"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">🚨 檢舉審核</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  待審：{reports.filter(r => r.status === "pending").length} 件
                </p>
              </div>
              <button onClick={fetchReports} className="btn-secondary text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> 刷新
              </button>
            </div>
            {reportsLoading ? (
              <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-16 shimmer" />)}</div>
            ) : reports.length === 0 ? (
              <div className="glass rounded-xl p-10 text-center text-gray-500">目前沒有任何檢舉</div>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <div key={r.id} className={`glass rounded-xl p-4 flex items-center gap-4 ${r.status !== "pending" ? "opacity-50" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "pending" ? "bg-red-900/30 text-red-400" : r.status === "resolved" ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                          {r.status === "pending" ? "待審" : r.status === "resolved" ? "已解決" : "已駁回"}
                        </span>
                        <span className="text-xs text-gray-500">原因：{r.reason}</span>
                        <span className="text-xs text-gray-600">by @{r.reporter?.username}</span>
                      </div>
                      <Link href={`/community/${r.post_id}`} target="_blank"
                        className="text-sm text-gray-200 hover:text-white truncate block">
                        {r.posts?.is_deleted ? <span className="line-through text-gray-600">貼文已刪除</span> : r.posts?.title}
                      </Link>
                    </div>
                    {r.status === "pending" && !r.posts?.is_deleted && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleReport(r.id, "delete_post", r.post_id)}
                          className="text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 px-3 py-1.5 rounded-lg transition-colors">
                          刪除貼文
                        </button>
                        <button onClick={() => handleReport(r.id, "dismiss")}
                          className="text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                          駁回
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentEditor({ title, description, settingKey, rules, setRules, saving, onSave, onLoad }: {
  title: string; description: string; settingKey: string;
  rules: string[]; setRules: (r: string[]) => void;
  saving: boolean; onSave: () => Promise<void>; onLoad: () => Promise<void>;
}) {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loaded) { onLoad().then(() => setLoaded(true)); }
  }, []);

  async function handleSave() {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateRule(i: number, v: string) {
    const next = [...rules]; next[i] = v; setRules(next);
  }
  function removeRule(i: number) { setRules(rules.filter((_, idx) => idx !== i)); }
  function addRule() { setRules([...rules, ""]); }
  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...rules]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setRules(next);
  }
  function moveDown(i: number) {
    if (i === rules.length - 1) return;
    const next = [...rules]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; setRules(next);
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>

      {!loaded ? (
        <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-10 rounded-lg glass shimmer" />)}</div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-5 text-right shrink-0">{i + 1}.</span>
              <input
                value={rule}
                onChange={e => updateRule(i, e.target.value)}
                placeholder={`規則 ${i + 1}`}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-1 shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0} title="上移"
                  className="p-1.5 text-gray-500 hover:text-gray-200 disabled:opacity-20 transition-colors">↑</button>
                <button onClick={() => moveDown(i)} disabled={i === rules.length - 1} title="下移"
                  className="p-1.5 text-gray-500 hover:text-gray-200 disabled:opacity-20 transition-colors">↓</button>
                <button onClick={() => removeRule(i)} title="刪除"
                  className="p-1.5 text-red-500 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addRule}
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-1">
            <Plus className="w-3.5 h-3.5" /> 新增規則
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-white/10">
        <button onClick={handleSave} disabled={saving || !loaded}
          className="btn-primary text-sm px-5 py-2 flex items-center gap-2 disabled:opacity-50">
          {saving ? "儲存中…" : saved ? "✓ 已儲存" : "儲存"}
        </button>
        <p className="text-xs text-gray-600">儲存後立即在網站前台生效</p>
      </div>
    </div>
  );
}
