"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, TrendingUp, MessageSquare } from "lucide-react";
import { formatPrice, timeAgo } from "@/lib/utils";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

const PriceChart = dynamic(() => import("@/components/ui/PriceChart").then(m => m.PriceChart), { ssr: false });

const CONDITION_LABEL: Record<string, string> = {
  M: "M（完美）", NM: "NM（近新）", LP: "LP（輕微磨損）",
  MP: "MP（中等磨損）", HP: "HP（重度磨損）",
  "PSA 10": "PSA 10", "PSA 9": "PSA 9", "PSA 8": "PSA 8",
  "BGS 9.5": "BGS 9.5", "BGS 9": "BGS 9",
};

const gameEmoji: Record<string, string> = {
  MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾",
};

export default function CollectionItemPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "price" | "discussion">("overview");
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("collections")
        .select(`*, cards(id, name, name_en, game, set_name, set_code, rarity, image_url, card_type, description, is_active)`)
        .eq("id", params.id)
        .eq("visibility", "public")
        .single();

      if (!data) { setLoading(false); return; }

      // If it has a real card_id, redirect to proper card page
      if (data.card_id && data.cards) {
        router.replace(`/cards/${data.card_id}`);
        return;
      }

      setItem(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  useEffect(() => {
    if (activeTab === "price" && item?.cards?.id) {
      supabase.from("price_reports")
        .select(`*, profiles(username)`)
        .eq("card_id", item.cards.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => setReports(data ?? []));
    }
  }, [activeTab, item]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-32 shimmer" />)}
    </div>
  );

  if (!item) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
      <p>找不到此收藏</p>
      <Link href="/cards" className="btn-secondary mt-4 inline-flex text-sm">回到卡牌庫</Link>
    </div>
  );

  const displayName = item.custom_name ?? item.cards?.name ?? "未命名卡牌";
  const displayImage = item.image_url ?? item.cards?.image_url ?? null;
  const displayGame = item.cards?.game ?? null;
  const displayRarity = item.cards?.rarity ?? null;
  const avgPrice = reports.length > 0 ? Math.round(reports.reduce((s: number, r: any) => s + r.price, 0) / reports.length) : null;
  const priceHistory = reports.slice(0, 6).reverse().map((r: any) => ({ date: timeAgo(new Date(r.created_at)), price: r.price }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Link href="javascript:history.back()" onClick={e => { e.preventDefault(); router.back(); }}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回
      </Link>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="aspect-[5/7] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-[80px] border border-white/10 shadow-2xl relative">
            {displayImage ? (
              <Image src={displayImage} alt={displayName} fill className="object-cover" />
            ) : (
              <span>{gameEmoji[displayGame ?? ""] ?? "🃏"}</span>
            )}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("連結已複製！"); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors">
            <Share2 className="w-4 h-4" /> 分享
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {displayRarity && <span className="badge text-xs text-purple-400 bg-purple-900/30">{displayRarity}</span>}
              {displayGame && <span className="badge text-xs bg-gray-800 text-gray-400">{displayGame}</span>}
              <span className="badge text-xs bg-gray-800 text-gray-400">TCG</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{displayName}</h1>
            {item.cards?.name_en && <div className="text-gray-400 text-sm mt-1">{item.cards.name_en}</div>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["系列", item.cards?.set_name ?? "-"],
              ["系列代碼", item.cards?.set_code ?? "-"],
              ["品相", CONDITION_LABEL[item.condition] ?? item.condition],
            ].map(([k, v]) => (
              <div key={k} className="glass rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">{k}</div>
                <div className="text-sm font-medium text-gray-200 truncate">{v}</div>
              </div>
            ))}
          </div>

          <div className="glass rounded-xl p-5 space-y-2">
            <div className="text-sm text-gray-500">社群均價（近期回報）</div>
            <div className="text-4xl font-bold text-white">
              {avgPrice ? formatPrice(avgPrice) : <span className="text-2xl text-gray-500">尚無資料</span>}
            </div>
          </div>

          {item.notes && (
            <p className="text-gray-400 text-sm leading-relaxed">{item.notes}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {(["overview", "price", "discussion"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {{ overview: "卡牌資訊", price: "價格記錄", discussion: "相關討論" }[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">卡牌屬性</h3>
            {[
              ["類型", item.cards?.card_type === "sports" ? "運動球員卡" : "集換式卡牌（TCG）"],
              ["遊戲", displayGame ?? "-"],
              ["系列", item.cards?.set_name ?? "-"],
              ["稀有度", displayRarity ?? "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">收藏資訊</h3>
            {[
              ["品相", CONDITION_LABEL[item.condition] ?? item.condition],
              ["數量", `${item.quantity} 張`],
              ["社群均價", avgPrice ? formatPrice(avgPrice) : "尚無資料"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "price" && (
        <div className="glass rounded-xl p-6 space-y-6">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" /> 價格回報記錄
          </h3>
          {priceHistory.length > 0 && <div className="h-48"><PriceChart data={priceHistory} /></div>}
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">還沒有價格回報</div>
          ) : reports.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-white/5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-200 font-bold">{formatPrice(r.price)}</span>
                <span className="badge text-xs bg-gray-800 text-gray-400">{r.condition}</span>
              </div>
              <div className="text-gray-500 text-xs">{r.profiles?.username ?? "匿名"} · {timeAgo(new Date(r.created_at))}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "discussion" && (
        <div className="text-center py-10 space-y-3 text-gray-500">
          <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm">前往社群討論此卡牌</p>
          <Link href={`/community?search=${encodeURIComponent(displayName)}`} className="btn-primary text-sm inline-flex">
            搜尋相關討論
          </Link>
        </div>
      )}
    </div>
  );
}
