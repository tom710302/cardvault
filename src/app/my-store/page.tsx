"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, X, Package, Calendar, Store, Edit2, Save, AlertCircle, ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface Product {
  id: string; name: string; description: string | null; price: number | null;
  stock: number; image_url: string | null; category: string | null; is_active: boolean;
}
interface Event {
  id: string; title: string; description: string | null;
  event_date: string | null; image_url: string | null; is_active: boolean;
}
interface StoreInfo {
  id: string; name: string; description: string | null; intro: string | null;
  phone: string | null; website: string | null; hours: string | null; image_url: string | null;
  games: string[]; products: string[];
}

const gameOptions = ["MTG", "寶可夢", "遊戲王", "NBA", "MLB", "NFL", "WS", "其他"];

export default function MyStorePage() {
  const [tab, setTab] = useState<"products" | "events" | "info">("products");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", stock: "0", image_url: "", category: "", game: "" });
  const [productSubmitting, setProductSubmitting] = useState(false);

  // Event form
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", event_date: "", end_date: "", location: "", registration_url: "", registration_info: "", image_url: "", image_urls: [] as string[] });
  const [eventSubmitting, setEventSubmitting] = useState(false);

  // Store info form
  const [infoForm, setInfoForm] = useState({ intro: "", hours: "", phone: "", website: "", image_url: "", games: [] as string[], products_tags: "" });
  const [infoSaving, setInfoSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);

      const { data: profile } = await supabase.from("profiles").select("role, store_id").eq("id", user.id).single();
      if (!profile?.store_id || !["store_owner", "admin"].includes(profile.role ?? "")) {
        router.push("/"); return;
      }
      setStoreId(profile.store_id);

      const { data: store } = await supabase.from("stores").select("*").eq("id", profile.store_id).single();
      if (store) {
        setStoreInfo(store);
        // intro 若為空則以 description 補充（向下相容舊資料）
        setInfoForm({ intro: store.intro ?? store.description ?? "", hours: store.hours ?? "", phone: store.phone ?? "", website: store.website ?? "", image_url: store.image_url ?? "", games: store.games ?? [], products_tags: (store.products ?? []).join(", ") });
      }

      setLoading(false);
      fetchProducts();
      fetchEvents();
    }
    load();
  }, []);

  async function fetchProducts() {
    const res = await fetch("/api/my-store/products");
    if (res.ok) { const { products } = await res.json(); setProducts(products); }
  }

  async function fetchEvents() {
    const res = await fetch("/api/my-store/events");
    if (res.ok) { const { events } = await res.json(); setEvents(events); }
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductSubmitting(true);
    const method = editProduct ? "PATCH" : "POST";
    const body = {
      ...(editProduct ? { id: editProduct.id } : {}),
      name: productForm.name,
      description: productForm.description || null,
      price: productForm.price ? parseInt(productForm.price) : null,
      stock: parseInt(productForm.stock) || 0,
      image_url: productForm.image_url || null,
      category: productForm.category || null,
      game: productForm.game || null,
    };
    const res = await fetch("/api/my-store/products", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowAddProduct(false);
      setEditProduct(null);
      setProductForm({ name: "", description: "", price: "", stock: "0", image_url: "", category: "", game: "" });
      fetchProducts();
    } else { const { error } = await res.json(); toast.error(error ?? "操作失敗"); }
    setProductSubmitting(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("確定下架此商品？")) return;
    await fetch("/api/my-store/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchProducts();
  }

  function startEditProduct(p: Product) {
    setEditProduct(p);
    setProductForm({ name: p.name, description: p.description ?? "", price: p.price?.toString() ?? "", stock: p.stock.toString(), image_url: p.image_url ?? "", category: p.category ?? "", game: (p as any).game ?? "" });
    setShowAddProduct(true);
  }

  async function submitEvent(e: React.FormEvent) {
    e.preventDefault();
    setEventSubmitting(true);
    const res = await fetch("/api/my-store/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
    if (res.ok) {
      setShowAddEvent(false);
      setEventForm({ title: "", description: "", event_date: "", end_date: "", location: "", registration_url: "", registration_info: "", image_url: "", image_urls: [] });
      fetchEvents();
    } else { const { error } = await res.json(); toast.error(error ?? "新增失敗"); }
    setEventSubmitting(false);
  }

  async function deleteEvent(id: string) {
    if (!confirm("確定下架此活動？")) return;
    await fetch("/api/my-store/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchEvents();
  }

  async function saveStoreInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) return;
    setInfoSaving(true);
    const { error } = await supabase.from("stores").update({
      intro: infoForm.intro || null,
      description: infoForm.intro || null,  // 同步更新 description 確保前台顯示
      hours: infoForm.hours || null,
      phone: infoForm.phone || null,
      website: infoForm.website || null,
      image_url: infoForm.image_url || null,
      games: infoForm.games,
      products: infoForm.products_tags.split(",").map(s => s.trim()).filter(Boolean),
    }).eq("id", storeId);
    if (!error) toast.success("店舖資訊已更新！");
    else toast.error(error.message);
    setInfoSaving(false);
  }

  function toggleGame(g: string) {
    setInfoForm(v => ({ ...v, games: v.games.includes(g) ? v.games.filter(x => x !== g) : [...v.games, g] }));
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 mb-2 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-6 h-6 text-brand-400" />
            <h1 className="text-2xl font-bold text-white">店舖後台</h1>
            <span className="badge text-xs text-orange-400 bg-orange-900/30">店主</span>
          </div>
          <p className="text-gray-400 text-sm">{storeInfo?.name} — 管理你的商品、活動與店舖資訊</p>
        </div>
        {storeId && (
          <Link href={`/stores/${storeId}`} className="btn-secondary text-sm flex items-center gap-2">
            查看店舖頁面 →
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {([["products", `📦 商品管理 (${products.length})`], ["events", `📅 活動管理 (${events.length})`], ["info", "🏪 店舖資訊"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 商品管理 ===== */}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Add/Edit Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
              <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">{editProduct ? "✏️ 編輯商品" : "📦 新增商品"}</h2>
                  <button onClick={() => { setShowAddProduct(false); setEditProduct(null); setProductForm({ name: "", description: "", price: "", stock: "0", image_url: "", category: "", game: "" }); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={submitProduct} className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">商品名稱 *</label>
                    <input value={productForm.name} onChange={e => setProductForm(v => ({ ...v, name: e.target.value }))} required
                      placeholder="例如：寶可夢 SV8 深淵之瞳 補充包"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">卡牌遊戲</label>
                      <select value={productForm.game} onChange={e => setProductForm(v => ({ ...v, game: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                        <option value="">不指定</option>
                        {["MTG", "寶可夢", "遊戲王", "NBA", "MLB", "NFL", "WS", "其他"].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">商品分類</label>
                      <select value={productForm.category} onChange={e => setProductForm(v => ({ ...v, category: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                        <option value="">不指定</option>
                        {["盒裝", "卡包", "卡套", "週邊商品", "單卡", "其他"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">售價（TWD）</label>
                      <input type="number" value={productForm.price} onChange={e => setProductForm(v => ({ ...v, price: e.target.value }))}
                        placeholder="150"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">庫存數量 *</label>
                      <input type="number" min={0} value={productForm.stock} onChange={e => setProductForm(v => ({ ...v, stock: e.target.value }))} required
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">商品描述（選填）</label>
                    <textarea value={productForm.description} onChange={e => setProductForm(v => ({ ...v, description: e.target.value }))} rows={2}
                      placeholder="商品說明、特色..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">商品圖片</label>
                    <ImageUpload folder="products" label="上傳商品圖片" hint="JPG、PNG，最大 5MB"
                      currentUrl={productForm.image_url} className="aspect-video"
                      onUpload={url => setProductForm(v => ({ ...v, image_url: url }))}
                      onRemove={() => setProductForm(v => ({ ...v, image_url: "" }))} />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowAddProduct(false); setEditProduct(null); }} className="btn-secondary text-sm px-4 py-2">取消</button>
                    <button type="submit" disabled={productSubmitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                      {productSubmitting ? "儲存中..." : editProduct ? "儲存變更" : "新增商品"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2"><Package className="w-4 h-4 text-brand-400" /> 在架商品（{products.length}）</h2>
            <button onClick={() => setShowAddProduct(true)} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> 新增商品
            </button>
          </div>

          {products.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center text-gray-500 space-y-3">
              <Package className="w-10 h-10 mx-auto opacity-30" />
              <p>還沒有商品，新增你的第一個商品吧！</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className={`glass rounded-xl p-4 flex items-center gap-4 ${!p.is_active ? "opacity-40" : ""}`}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center text-2xl shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-200">{p.name}</span>
                      {p.category && <span className="badge text-xs bg-gray-800 text-gray-400">{p.category}</span>}
                    </div>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {p.price && <span className="text-brand-400 font-medium">NT${p.price.toLocaleString()}</span>}
                      <span className={`flex items-center gap-1 text-xs font-medium ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-yellow-400" : "text-green-400"}`}>
                        {p.stock === 0 ? "❌ 已售完" : p.stock <= 5 ? `⚠️ 剩 ${p.stock} 件` : `✅ 庫存 ${p.stock} 件`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditProduct(p)} className="p-2 text-brand-400 hover:text-brand-300 bg-brand-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 活動管理 ===== */}
      {tab === "events" && (
        <div className="space-y-4">
          {showAddEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
              <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 my-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">📅 新增活動</h2>
                  <button onClick={() => setShowAddEvent(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={submitEvent} className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">活動名稱 *</label>
                    <input value={eventForm.title} onChange={e => setEventForm(v => ({ ...v, title: e.target.value }))} required
                      placeholder="例如：寶可夢 SV8 預購活動"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">開始日期</label>
                      <input type="date" value={eventForm.event_date} onChange={e => setEventForm(v => ({ ...v, event_date: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">結束日期</label>
                      <input type="date" value={eventForm.end_date} onChange={e => setEventForm(v => ({ ...v, end_date: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">活動地點</label>
                    <input value={eventForm.location} onChange={e => setEventForm(v => ({ ...v, location: e.target.value }))}
                      placeholder="例如：店內二樓活動區 / 線上報名"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">活動說明</label>
                    <textarea value={eventForm.description} onChange={e => setEventForm(v => ({ ...v, description: e.target.value }))} rows={4}
                      placeholder="詳細說明活動內容、規則、獎品..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">報名方式說明</label>
                    <textarea value={eventForm.registration_info} onChange={e => setEventForm(v => ({ ...v, registration_info: e.target.value }))} rows={3}
                      placeholder="例如：現場報名、限額50人、費用$300..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">報名連結（選填）</label>
                    <input type="url" value={eventForm.registration_url} onChange={e => setEventForm(v => ({ ...v, registration_url: e.target.value }))}
                      placeholder="https://forms.gle/..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">主視覺圖片</label>
                    <ImageUpload folder="events" label="上傳活動海報" hint="JPG、PNG，最大 5MB"
                      currentUrl={eventForm.image_url} className="aspect-video"
                      onUpload={url => setEventForm(v => ({ ...v, image_url: url }))}
                      onRemove={() => setEventForm(v => ({ ...v, image_url: "" }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">其他活動圖片（最多 6 張）</label>
                    <div className="grid grid-cols-3 gap-2">
                      {eventForm.image_urls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setEventForm(v => ({ ...v, image_urls: v.image_urls.filter((_, idx) => idx !== i) }))}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                        </div>
                      ))}
                      {eventForm.image_urls.length < 6 && (
                        <ImageUpload folder="events" label="+" hint=""
                          className="aspect-square"
                          onUpload={url => setEventForm(v => ({ ...v, image_urls: [...v.image_urls, url] }))} />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => setShowAddEvent(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                    <button type="submit" disabled={eventSubmitting} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                      {eventSubmitting ? "新增中..." : "發布活動"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-400" /> 活動列表（{events.length}）</h2>
            <button onClick={() => setShowAddEvent(true)} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> 新增活動
            </button>
          </div>

          {events.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center text-gray-500 space-y-3">
              <Calendar className="w-10 h-10 mx-auto opacity-30" />
              <p>還沒有活動，新增你的第一個活動吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className={`glass rounded-xl overflow-hidden flex ${!ev.is_active ? "opacity-40" : ""}`}>
                  {ev.image_url && (
                    <img src={ev.image_url} alt={ev.title} className="w-24 h-24 object-cover shrink-0" />
                  )}
                  <div className="p-4 flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-200">{ev.title}</p>
                        {ev.event_date && ev.event_date < new Date().toISOString().slice(0, 10) && (
                          <span className="badge text-xs bg-gray-800 text-gray-500 shrink-0">已結束</span>
                        )}
                      </div>
                      {ev.event_date && (
                        <p className="text-xs text-brand-400 mt-0.5">📅 {new Date(ev.event_date).toLocaleDateString("zh-TW")}</p>
                      )}
                      {ev.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-900/20 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 店舖資訊 ===== */}
      {tab === "info" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><Store className="w-4 h-4 text-brand-400" /> 編輯店舖資訊</h2>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              更新後將立即顯示在店舖頁面上
            </div>
            <form onSubmit={saveStoreInfo} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">店舖簡介</label>
                <textarea value={infoForm.intro} onChange={e => setInfoForm(v => ({ ...v, intro: e.target.value }))} rows={4}
                  placeholder="介紹你的店舖特色、服務、理念..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">電話</label>
                  <input value={infoForm.phone} onChange={e => setInfoForm(v => ({ ...v, phone: e.target.value }))}
                    placeholder="02-xxxx-xxxx"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">網站</label>
                  <input value={infoForm.website} onChange={e => setInfoForm(v => ({ ...v, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">營業時間</label>
                <input value={infoForm.hours} onChange={e => setInfoForm(v => ({ ...v, hours: e.target.value }))}
                  placeholder="週一至週日 11:00-21:00"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">販售卡牌種類</label>
                <div className="flex flex-wrap gap-2">
                  {gameOptions.map(g => (
                    <button key={g} type="button" onClick={() => toggleGame(g)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${infoForm.games.includes(g) ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">其他商品標籤（用逗號分隔）</label>
                <input value={infoForm.products_tags} onChange={e => setInfoForm(v => ({ ...v, products_tags: e.target.value }))}
                  placeholder="例如：卡套, 收藏冊, 週邊商品, 二手卡"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">店舖封面照片</label>
                <ImageUpload folder="stores" label="更換店舖封面" hint="建議使用橫幅圖片，JPG、PNG，最大 5MB"
                  currentUrl={infoForm.image_url} className="aspect-video"
                  onUpload={url => setInfoForm(v => ({ ...v, image_url: url }))}
                  onRemove={() => setInfoForm(v => ({ ...v, image_url: "" }))} />
              </div>
              <button type="submit" disabled={infoSaving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50">
                <Save className="w-4 h-4" /> {infoSaving ? "儲存中..." : "儲存店舖資訊"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
