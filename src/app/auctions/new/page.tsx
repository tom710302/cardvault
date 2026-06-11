"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gavel, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function NewAuctionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    starting_price: "",
    min_increment: "100",
    end_at: "",
    contact_info: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/auth/login");
      else setUser(user);
    });
  }, []);

  // 預設結標時間為 3 天後
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setMinutes(0, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm(v => ({ ...v, end_at: local }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.starting_price || !form.end_at) { alert("請填寫必填欄位"); return; }
    if (new Date(form.end_at) <= new Date()) { alert("結標時間必須在未來"); return; }
    setSubmitting(true);
    const res = await fetch("/api/auctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const { auction } = await res.json();
      router.push(`/auctions/${auction.id}`);
    } else {
      const { error } = await res.json();
      alert(error ?? "建立失敗");
    }
    setSubmitting(false);
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/auctions" className="text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gavel className="w-6 h-6 text-brand-400" /> 發起競標
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">填寫商品資訊，讓其他收藏家來競標</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
        {/* 商品圖片 */}
        <div>
          <label className="text-sm text-gray-300 font-medium mb-2 block">商品照片（選填）</label>
          <ImageUpload
            folder="auctions"
            label="上傳商品照片"
            hint="JPG、PNG，最大 5MB"
            currentUrl={form.image_url}
            className="aspect-video"
            onUpload={url => setForm(v => ({ ...v, image_url: url }))}
            onRemove={() => setForm(v => ({ ...v, image_url: "" }))}
          />
        </div>

        {/* 商品名稱 */}
        <div>
          <label className="text-sm text-gray-300 font-medium mb-1.5 block">商品名稱 *</label>
          <input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} required
            placeholder="例：PSA 10 超級路卡利歐ex、MTG 黑蓮花…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        {/* 商品描述 */}
        <div>
          <label className="text-sm text-gray-300 font-medium mb-1.5 block">商品描述（選填）</label>
          <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={3}
            placeholder="卡況說明、入手來源、附件、注意事項…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>

        {/* 起標價 & 最低加價 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300 font-medium mb-1.5 block">起標價（NT$）*</label>
            <input type="number" min={1} value={form.starting_price} onChange={e => setForm(v => ({ ...v, starting_price: e.target.value }))} required
              placeholder="例：500"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-1.5 block">最低加價（NT$）*</label>
            <input type="number" min={1} value={form.min_increment} onChange={e => setForm(v => ({ ...v, min_increment: e.target.value }))} required
              placeholder="例：100"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-[11px] text-gray-600 mt-1">每次出價至少要加這麼多</p>
          </div>
        </div>

        {/* 結標時間 */}
        <div>
          <label className="text-sm text-gray-300 font-medium mb-1.5 block">結標時間 *</label>
          <input type="datetime-local" value={form.end_at} onChange={e => setForm(v => ({ ...v, end_at: e.target.value }))} required
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex gap-2 mt-2">
            {[1, 3, 7].map(days => (
              <button key={days} type="button" onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + days);
                d.setMinutes(0, 0, 0);
                setForm(v => ({ ...v, end_at: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
              }} className="text-xs px-3 py-1 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors">
                {days} 天後
              </button>
            ))}
          </div>
        </div>

        {/* 聯絡方式 */}
        <div>
          <label className="text-sm text-gray-300 font-medium mb-1.5 block">得標後聯絡方式（選填）</label>
          <input value={form.contact_info} onChange={e => setForm(v => ({ ...v, contact_info: e.target.value }))}
            placeholder="例：Line ID: xxx、IG: @xxx、得標後私訊…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        <div className="glass rounded-xl px-4 py-3 text-xs text-gray-500 flex items-start gap-2">
          <span className="shrink-0">⚠️</span>
          <p>本平台僅提供競標媒合服務，交易由買賣雙方自行完成，平台不介入付款或物流。請謹慎確認商品資訊。</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/auctions" className="btn-secondary flex-1 text-center text-sm py-3">取消</Link>
          <button type="submit" disabled={submitting}
            className="btn-primary flex-1 text-sm py-3 disabled:opacity-50 flex items-center justify-center gap-2">
            <Gavel className="w-4 h-4" /> {submitting ? "建立中…" : "發起競標"}
          </button>
        </div>
      </form>
    </div>
  );
}
