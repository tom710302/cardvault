"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Grid3X3, Star, Package, Eye, EyeOff, Trash2, Plus, Save, X, Camera } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface Profile {
  id: string; username: string; display_name: string | null; bio: string | null;
  avatar_url: string | null; reputation: number; role: string;
}
interface CollectionItem {
  id: string; card_id: string; condition: string; quantity: number;
  notes: string | null; image_url: string | null; visibility: string;
  cards: { id: string; name: string; game: string; rarity: string | null; image_url: string | null } | null;
}
interface ShowcasePost {
  id: string; title: string; board: string; post_type: string;
  upvotes: number; view_count: number; created_at: string; image_urls: string[] | null;
}

const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

export default function MyPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"collection" | "posts" | "settings">("collection");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", display_name: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) { setProfile(p); setEditForm({ username: p.username ?? "", display_name: p.display_name ?? "", bio: p.bio ?? "" }); }
      setLoading(false);

      // Load collection
      const colRes = await fetch("/api/collections");
      if (colRes.ok) { const { collections } = await colRes.json(); setCollection(collections ?? []); }

      // Load posts
      const { data: postsData } = await supabase.from("posts").select("id, title, board, post_type, upvotes, view_count, created_at, image_urls").eq("author_id", user.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(30);
      if (postsData) setPosts(postsData);
    }
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ username: editForm.username, display_name: editForm.display_name, bio: editForm.bio, updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (!error) { setProfile(p => p ? { ...p, ...editForm } : p); setShowEditProfile(false); }
    else alert(error.message);
    setSavingProfile(false);
  }

  async function removeFromCollection(id: string) {
    await fetch("/api/collections", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setCollection(prev => prev.filter(i => i.id !== id));
  }

  async function toggleVisibility(id: string, current: string) {
    const next = current === "public" ? "private" : "public";
    await fetch("/api/collections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, visibility: next }) });
    setCollection(prev => prev.map(i => i.id === id ? { ...i, visibility: next } : i));
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="glass rounded-2xl h-40 shimmer" />
      <div className="grid grid-cols-3 gap-1">{Array(9).fill(0).map((_, i) => <div key={i} className="aspect-square glass shimmer" />)}</div>
    </div>
  );

  if (!profile) return null;

  const publicCollection = collection.filter(i => i.visibility === "public");
  const privateCollection = collection.filter(i => i.visibility === "private");

  return (
    <div className="max-w-3xl mx-auto">
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">編輯個人資料</h2>
              <button onClick={() => setShowEditProfile(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveProfile} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">用戶名</label>
                <input value={editForm.username} onChange={e => setEditForm(v => ({ ...v, username: e.target.value }))} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">顯示名稱</label>
                <input value={editForm.display_name} onChange={e => setEditForm(v => ({ ...v, display_name: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">自我介紹</label>
                <textarea value={editForm.bio} onChange={e => setEditForm(v => ({ ...v, bio: e.target.value }))} rows={3} maxLength={200}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                <p className="text-xs text-gray-600 mt-1">{editForm.bio.length} / 200</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowEditProfile(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={savingProfile} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {savingProfile ? "儲存中..." : "儲存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IG-style Profile Header */}
      <div className="px-4 pt-8 pb-4 space-y-5">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold border-2 border-white/10 overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                : profile.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-xl font-bold text-white">{profile.username}</h1>
              {profile.role !== "user" && (
                <span className={`badge text-xs ${profile.role === "admin" ? "text-red-400 bg-red-900/30" : "text-yellow-400 bg-yellow-900/30"}`}>{profile.role}</span>
              )}
            </div>

            {/* Stats Row */}
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
            {(profile.display_name || profile.bio) && (
              <div className="text-sm space-y-0.5">
                {profile.display_name && profile.display_name !== profile.username && (
                  <p className="font-semibold text-gray-200">{profile.display_name}</p>
                )}
                {profile.bio && <p className="text-gray-400 leading-relaxed">{profile.bio}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button onClick={() => setShowEditProfile(true)}
            className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
            <Settings className="w-4 h-4" /> 編輯個人資料
          </button>
          <Link href="/collection" className="px-4 py-2 btn-secondary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新增收藏
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-white/10 flex">
        {([
          ["collection", <Grid3X3 className="w-5 h-5" />, "收藏"],
          ["posts", <Star className="w-5 h-5" />, "貼文"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-t-2 -mt-px transition-colors",
              tab === id ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            )}>
            {icon} <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <button onClick={() => setTab("settings")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-t-2 -mt-px transition-colors",
            tab === "settings" ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          )}>
          <Settings className="w-5 h-5" /> <span className="hidden sm:inline">設定</span>
        </button>
      </div>

      {/* Collection Grid (IG style) */}
      {tab === "collection" && (
        <div className="space-y-1">
          {/* Section: Public */}
          {collection.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-3 px-4">
              <Package className="w-12 h-12 mx-auto opacity-30" />
              <p>還沒有收藏，去卡牌資料庫加入第一張卡！</p>
              <Link href="/cards" className="btn-primary text-sm inline-flex">瀏覽卡牌</Link>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-3 gap-0.5">
                {collection.map(item => (
                  <div key={item.id} className="relative aspect-square bg-gray-900 overflow-hidden group">
                    {/* Image */}
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

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <p className="text-white text-xs font-semibold text-center px-2 line-clamp-2">{item.cards?.name}</p>
                      <p className="text-gray-300 text-[10px]">{item.condition}</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => toggleVisibility(item.id, item.visibility)}
                          className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title={item.visibility === "public" ? "設為私人" : "設為公開"}>
                          {item.visibility === "public" ? <Eye className="w-3.5 h-3.5 text-white" /> : <EyeOff className="w-3.5 h-3.5 text-gray-300" />}
                        </button>
                        <Link href={`/cards/${item.card_id}`}
                          className="p-1.5 bg-brand-600/80 rounded-full hover:bg-brand-600 transition-colors">
                          <Grid3X3 className="w-3.5 h-3.5 text-white" />
                        </Link>
                        <button onClick={() => removeFromCollection(item.id)}
                          className="p-1.5 bg-red-600/80 rounded-full hover:bg-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Private badge */}
                    {item.visibility === "private" && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                        <EyeOff className="w-2.5 h-2.5 text-gray-400" />
                      </div>
                    )}
                    {/* Quantity badge */}
                    {item.quantity > 1 && (
                      <div className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ×{item.quantity}
                      </div>
                    )}
                  </div>
                ))}
                {/* Add button */}
                <Link href="/cards" className="aspect-square bg-gray-900 border border-dashed border-white/10 hover:border-brand-500/50 flex items-center justify-center transition-colors group">
                  <Plus className="w-8 h-8 text-gray-600 group-hover:text-brand-400 transition-colors" />
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500 border-t border-white/5">
                <span>共 {collection.length} 張 · 公開 {publicCollection.length} · 私人 {privateCollection.length}</span>
                <span>{new Set(collection.map(i => i.cards?.game)).size} 種遊戲</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Posts Grid */}
      {tab === "posts" && (
        <div className="space-y-1">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-3 px-4">
              <Star className="w-12 h-12 mx-auto opacity-30" />
              <p>還沒有發過貼文</p>
              <Link href="/community" className="btn-primary text-sm inline-flex">去社群發文</Link>
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
                  {/* Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-medium">
                    <span>▲ {post.upvotes}</span>
                    <span>👁 {post.view_count}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
          <h2 className="font-semibold text-white">帳號設定</h2>
          <div className="glass rounded-2xl divide-y divide-white/5">
            <button onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors text-sm text-gray-300">
              <span className="flex items-center gap-3"><Settings className="w-4 h-4 text-brand-400" /> 編輯個人資料</span>
              <span className="text-gray-600">›</span>
            </button>
            <Link href="/profile" className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors text-sm text-gray-300">
              <span className="flex items-center gap-3"><Eye className="w-4 h-4 text-brand-400" /> 帳號安全 / 密碼</span>
              <span className="text-gray-600">›</span>
            </Link>
            <Link href="/wishlist" className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors text-sm text-gray-300">
              <span className="flex items-center gap-3">⭐ 想求清單</span>
              <span className="text-gray-600">›</span>
            </Link>
            <button onClick={async () => { await createClient().auth.signOut(); window.location.href = "/"; }}
              className="w-full flex items-center px-4 py-3.5 hover:bg-white/5 transition-colors text-sm text-red-400">
              登出
            </button>
          </div>
        </div>
      )}

      <div className="h-16" />
    </div>
  );
}
