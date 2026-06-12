"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, Grid3X3, Star, Package, Eye, EyeOff, Trash2, Plus, Save, X, Camera, ArrowLeftRight, Search, List, BarChart3, TrendingUp } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { TrustBadge } from "@/components/trade/TrustBadge";

interface Profile {
  id: string; username: string; display_name: string | null; bio: string | null;
  avatar_url: string | null; reputation: number; role: string;
}
interface CollectionItem {
  id: string; card_id: string | null; custom_name: string | null; condition: string; quantity: number;
  notes: string | null; image_url: string | null; visibility: string;
  cards: { id: string; name: string; name_en: string | null; game: string; set_name: string | null; rarity: string | null; image_url: string | null } | null;
}
interface Card { id: string; name: string; name_en: string | null; game: string; set_name: string | null; rarity: string | null; }
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
  const [tab, setTab] = useState<"collection" | "posts" | "trade" | "settings">("collection");
  const [tradeHaves, setTradeHaves] = useState<any[]>([]);
  const [colView, setColView] = useState<"grid" | "list">("grid");
  const [colSearch, setColSearch] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [colCards, setColCards] = useState<Card[]>([]);
  const [colCardSearch, setColCardSearch] = useState("");
  const [addCardForm, setAddCardForm] = useState({ card_id: "", condition: "NM", quantity: 1, notes: "", image_url: "", visibility: "public" });
  const [colSubmitting, setColSubmitting] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", display_name: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const avatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarLongPressedRef = useRef(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchCollection = useCallback(async () => {
    const res = await fetch("/api/collections");
    if (res.ok) { const { collections } = await res.json(); setCollection(collections ?? []); }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) { setProfile(p); setEditForm({ username: p.username ?? "", display_name: p.display_name ?? "", bio: p.bio ?? "" }); }
      setLoading(false);

      await fetchCollection();

      const { data: postsData } = await supabase.from("posts").select("id, title, board, post_type, upvotes, view_count, created_at, image_urls").eq("author_id", user.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(30);
      if (postsData) setPosts(postsData);

      const tradeRes = await fetch(`/api/trade/haves?user_id=${user.id}`);
      if (tradeRes.ok) { const { haves } = await tradeRes.json(); setTradeHaves(haves ?? []); }
    }
    load();
  }, [fetchCollection]);

  function onAvatarPressStart() {
    avatarLongPressedRef.current = false;
    avatarTimerRef.current = setTimeout(() => {
      avatarLongPressedRef.current = true;
      avatarTimerRef.current = null;
      setShowAvatarLightbox(true);
    }, 2000);
  }
  function onAvatarPressEnd() {
    if (avatarTimerRef.current !== null) {
      clearTimeout(avatarTimerRef.current);
      avatarTimerRef.current = null;
    }
    if (!avatarLongPressedRef.current) {
      avatarFileRef.current?.click();
    }
    avatarLongPressedRef.current = false;
  }
  function onAvatarPressCancel() {
    if (avatarTimerRef.current !== null) {
      clearTimeout(avatarTimerRef.current);
      avatarTimerRef.current = null;
    }
    avatarLongPressedRef.current = false;
  }

  async function handleAvatarUpload(url: string) {
    if (!profile) return;
    setUploadingAvatar(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    if (!error) setProfile(p => p ? { ...p, avatar_url: url } : p);
    setUploadingAvatar(false);
  }

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

  async function searchColCards(q: string) {
    setColCardSearch(q);
    if (q.length < 1) { setColCards([]); return; }
    const res = await fetch(`/api/cards?search=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) { const { cards } = await res.json(); setColCards(cards ?? []); }
  }

  async function addCardToCollection(e: React.FormEvent) {
    e.preventDefault();
    const custom_name = addCardForm.card_id ? "" : colCardSearch.trim();
    if (!addCardForm.card_id && !custom_name) { alert("請輸入或選擇卡牌名稱"); return; }
    setColSubmitting(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addCardForm, custom_name }),
    });
    if (res.ok) {
      setShowAddCard(false);
      setAddCardForm({ card_id: "", condition: "NM", quantity: 1, notes: "", image_url: "", visibility: "public" });
      setColCardSearch(""); setColCards([]);
      fetchCollection();
    } else {
      const { error } = await res.json();
      alert(error ?? "新增失敗");
    }
    setColSubmitting(false);
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="glass rounded-2xl h-40 shimmer" />
      <div className="grid grid-cols-3 gap-1">{Array(9).fill(0).map((_, i) => <div key={i} className="aspect-square glass shimmer" />)}</div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Avatar Lightbox */}
      {showAvatarLightbox && profile.avatar_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setShowAvatarLightbox(false)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAvatarLightbox(false)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white z-10">
              <X className="w-4 h-4" />
            </button>
            <img src={profile.avatar_url} alt={profile.username}
              className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover border-4 border-white/20 shadow-2xl" />
          </div>
        </div>
      )}

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

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">新增卡牌到收藏庫</h2>
              <button onClick={() => setShowAddCard(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addCardToCollection} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">搜尋卡牌</label>
                <input value={colCardSearch} onChange={e => searchColCards(e.target.value)}
                  placeholder="輸入卡牌名稱..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
                {colCardSearch.length > 0 && colCards.length === 0 && !addCardForm.card_id && (
                  <p className="mt-1 text-xs text-gray-500 px-1">找不到符合的卡牌，將以自訂名稱儲存</p>
                )}
                {colCards.length > 0 && (
                  <div className="mt-1 glass rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {colCards.map(card => (
                      <button key={card.id} type="button"
                        onClick={() => { setAddCardForm(v => ({ ...v, card_id: card.id })); setColCardSearch(card.name); setColCards([]); }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors",
                          addCardForm.card_id === card.id ? "bg-brand-600/20 text-brand-300" : "text-gray-200"
                        )}>
                        {card.name} <span className="text-gray-500 text-xs">· {card.game}</span>
                      </button>
                    ))}
                  </div>
                )}
                {addCardForm.card_id && (
                  <p className="mt-1 text-xs text-green-400 px-1">✓ 已選擇：{colCardSearch}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">品相</label>
                  <select value={addCardForm.condition} onChange={e => setAddCardForm(v => ({ ...v, condition: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    {["M", "NM", "LP", "MP", "HP", "D", "PSA 10", "PSA 9", "BGS 9.5", "BGS 9"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">數量</label>
                  <input type="number" min={1} max={99} value={addCardForm.quantity}
                    onChange={e => setAddCardForm(v => ({ ...v, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
                <input value={addCardForm.notes} onChange={e => setAddCardForm(v => ({ ...v, notes: e.target.value }))}
                  placeholder="入手方式、心得..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">上傳卡牌照片（選填）</label>
                <ImageUpload
                  folder="collections"
                  label="上傳你的卡牌實體照片"
                  hint="JPG、PNG，最大 5MB"
                  currentUrl={addCardForm.image_url}
                  className="aspect-[5/3]"
                  onUpload={(url) => setAddCardForm(v => ({ ...v, image_url: url }))}
                  onRemove={() => setAddCardForm(v => ({ ...v, image_url: "" }))}
                />
              </div>
              <div className="flex items-center justify-between py-2 border border-white/10 rounded-xl px-3">
                <div className="flex items-center gap-2 text-sm">
                  {addCardForm.visibility === "public"
                    ? <Eye className="w-4 h-4 text-green-400" />
                    : <EyeOff className="w-4 h-4 text-gray-500" />}
                  <span className="text-gray-300">{addCardForm.visibility === "public" ? "公開展示" : "僅自己可見"}</span>
                </div>
                <button type="button"
                  onClick={() => setAddCardForm(v => ({ ...v, visibility: v.visibility === "public" ? "private" : "public" }))}
                  className={cn("text-xs px-3 py-1 rounded-full transition-colors",
                    addCardForm.visibility === "public"
                      ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  )}>
                  {addCardForm.visibility === "public" ? "切換為私人" : "切換為公開"}
                </button>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddCard(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={colSubmitting || (!addCardForm.card_id && !colCardSearch.trim())}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {colSubmitting ? "新增中..." : "新增到收藏"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IG-style Profile Header */}
      <div className="px-4 pt-8 pb-4 space-y-5">
        <div className="flex items-start gap-6">
          {/* Avatar - 點擊換頭貼，長按2秒放大 */}
          <div className="relative shrink-0 group/avatar">
            <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("file", file);
              formData.append("folder", "avatars");
              setUploadingAvatar(true);
              const res = await fetch("/api/upload", { method: "POST", body: formData });
              if (res.ok) { const { url } = await res.json(); await handleAvatarUpload(url); }
              setUploadingAvatar(false);
              e.target.value = "";
            }} />
            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold border-2 border-white/10 overflow-hidden cursor-pointer select-none"
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
              onMouseDown={onAvatarPressStart}
              onMouseUp={onAvatarPressEnd}
              onMouseLeave={onAvatarPressCancel}
              onTouchStart={onAvatarPressStart}
              onTouchEnd={onAvatarPressEnd}
              onTouchCancel={onAvatarPressCancel}
              onContextMenu={e => e.preventDefault()}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover pointer-events-none" />
                : profile.username?.[0]?.toUpperCase() ?? "?"}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                {uploadingAvatar
                  ? <span className="text-white text-xs">上傳中...</span>
                  : <Camera className="w-6 h-6 text-white" />}
              </div>
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
              <div className="text-sm space-y-0.5 mb-2">
                {profile.display_name && profile.display_name !== profile.username && (
                  <p className="font-semibold text-gray-200">{profile.display_name}</p>
                )}
                {profile.bio && <p className="text-gray-400 leading-relaxed">{profile.bio}</p>}
              </div>
            )}

            {/* Trust Badge */}
            <TrustBadge userId={profile.id} size="sm" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button onClick={() => setShowEditProfile(true)}
            className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
            <Settings className="w-4 h-4" /> 編輯個人資料
          </button>
          <Link href="/trade/offers" className="px-4 py-2 btn-secondary text-sm flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" /> 換卡信箱
          </Link>
          <button onClick={() => setShowAddCard(true)} className="px-4 py-2 btn-secondary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
          </button>
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
        <button onClick={() => setTab("settings")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-t-2 -mt-px transition-colors",
            tab === "settings" ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          )}>
          <Settings className="w-5 h-5" /> <span className="hidden sm:inline">設定</span>
        </button>
      </div>

      {/* Collection Tab */}
      {tab === "collection" && (() => {
        const totalCards = collection.reduce((s, i) => s + i.quantity, 0);
        const uniqueGames = Array.from(new Set(collection.map(i => i.cards?.game).filter(Boolean))).length;
        const gradedCount = collection.filter(i => i.condition.includes("PSA") || i.condition.includes("BGS")).length;
        const filteredCollection = collection.filter(item =>
          !colSearch || item.cards?.name.includes(colSearch) || item.cards?.game.includes(colSearch) || (item.custom_name ?? "").includes(colSearch)
        );
        return (
          <div className="space-y-4 px-4 py-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1 text-blue-400"><Package className="w-3.5 h-3.5" /><span className="text-xs text-gray-500">總收藏數</span></div>
                <div className="text-xl font-bold text-white">{totalCards} 張</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1 text-green-400"><TrendingUp className="w-3.5 h-3.5" /><span className="text-xs text-gray-500">種類數</span></div>
                <div className="text-xl font-bold text-white">{collection.length} 種</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1 text-yellow-400"><Star className="w-3.5 h-3.5" /><span className="text-xs text-gray-500">遊戲種類</span></div>
                <div className="text-xl font-bold text-white">{uniqueGames} 種</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1 text-brand-400"><BarChart3 className="w-3.5 h-3.5" /><span className="text-xs text-gray-500">已評級</span></div>
                <div className="text-xl font-bold text-white">{gradedCount} 張</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input placeholder="搜尋收藏..." value={colSearch} onChange={e => setColSearch(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
              </div>
              <button onClick={() => setColView("grid")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", colView === "grid" ? "bg-brand-600 text-white" : "btn-secondary")}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setColView("list")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", colView === "list" ? "bg-brand-600 text-white" : "btn-secondary")}>
                <List className="w-4 h-4" />
              </button>
            </div>

            {collection.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-3">
                <Package className="w-12 h-12 mx-auto opacity-30" />
                <p>還沒有收藏，點上方 + 新增第一張！</p>
                <button onClick={() => setShowAddCard(true)} className="btn-primary text-sm">+ 新增卡牌</button>
              </div>
            ) : filteredCollection.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-3">
                <Package className="w-12 h-12 mx-auto opacity-30" />
                <p>沒有符合搜尋的卡牌</p>
              </div>
            ) : colView === "grid" ? (
              <div className="grid grid-cols-3 gap-0.5">
                <button onClick={() => setShowAddCard(true)}
                  className="aspect-square bg-gray-900 border border-dashed border-white/10 hover:border-brand-500/50 flex items-center justify-center transition-colors group">
                  <Plus className="w-8 h-8 text-gray-600 group-hover:text-brand-400 transition-colors" />
                </button>
                {filteredCollection.map(item => (
                  <div key={item.id} className="relative aspect-square bg-gray-900 overflow-hidden group">
                    {item.image_url || item.cards?.image_url ? (
                      <img src={item.image_url ?? item.cards?.image_url ?? ""} alt={item.cards?.name ?? item.custom_name ?? ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <span className="text-4xl">{gameEmoji[item.cards?.game ?? ""] ?? "🃏"}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <p className="text-white text-xs font-semibold text-center px-2 line-clamp-2">{item.cards?.name ?? item.custom_name}</p>
                      <p className="text-gray-300 text-[10px]">{item.condition}</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => toggleVisibility(item.id, item.visibility)}
                          className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                          {item.visibility === "public" ? <Eye className="w-3.5 h-3.5 text-white" /> : <EyeOff className="w-3.5 h-3.5 text-gray-300" />}
                        </button>
                        {item.card_id && (
                          <Link href={`/cards/${item.card_id}`} className="p-1.5 bg-brand-600/80 rounded-full hover:bg-brand-600 transition-colors">
                            <Grid3X3 className="w-3.5 h-3.5 text-white" />
                          </Link>
                        )}
                        <button onClick={() => removeFromCollection(item.id)}
                          className="p-1.5 bg-red-600/80 rounded-full hover:bg-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                    {item.visibility === "private" && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                        <EyeOff className="w-2.5 h-2.5 text-gray-400" />
                      </div>
                    )}
                    {item.quantity > 1 && (
                      <div className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ×{item.quantity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCollection.map(item => (
                  <div key={item.id} className="glass rounded-xl p-3 flex items-center gap-3 group">
                    <div className="w-10 h-14 bg-gray-800 rounded-lg flex items-center justify-center text-xl shrink-0 overflow-hidden">
                      {item.image_url || item.cards?.image_url
                        ? <img src={item.image_url ?? item.cards?.image_url ?? ""} alt="" className="w-full h-full object-cover" />
                        : <span>🃏</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">{item.cards?.name ?? item.custom_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.cards?.game ?? "自訂"} · {item.condition}</div>
                      {item.notes && <div className="text-xs text-gray-600 italic mt-1 truncate">{item.notes}</div>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-gray-400">x{item.quantity}</span>
                      <button onClick={() => toggleVisibility(item.id, item.visibility)} className="text-gray-600 hover:text-gray-300 transition-colors">
                        {item.visibility === "public" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
                      </button>
                      <button onClick={() => removeFromCollection(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Trade Tab */}
      {tab === "trade" && (
        <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
          {/* Trust summary */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-brand-400" /> 我的換卡信譽
            </h2>
            <TrustBadge userId={profile.id} size="md" />
            <div className="flex gap-2 pt-1">
              <Link href="/trade/offers" className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
                換卡信箱
              </Link>
              <Link href="/trade/my-list" className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
                管理清單
              </Link>
            </div>
          </div>

          {/* My haves */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              我的可換清單（{tradeHaves.length} 張）
            </h3>
            {tradeHaves.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-gray-500 space-y-2">
                <p className="text-sm">還沒有登記可換的牌</p>
                <Link href="/trade/my-list" className="btn-primary text-sm inline-flex gap-1.5 mt-1">
                  <Plus className="w-4 h-4" /> 管理清單
                </Link>
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
                <Link href="/trade/my-list" className="aspect-square bg-gray-900 border border-dashed border-white/10 hover:border-brand-500/50 flex items-center justify-center transition-colors group">
                  <Plus className="w-8 h-8 text-gray-600 group-hover:text-brand-400 transition-colors" />
                </Link>
              </div>
            )}
          </div>
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
            <Link href="/trade" className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors text-sm text-gray-300">
              <span className="flex items-center gap-3">⭐ 想求換卡</span>
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
