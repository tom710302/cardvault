"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ChevronRight, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "待回覆", color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30" },
  accepted:  { label: "已接受", color: "text-green-400 bg-green-900/20 border-green-700/30" },
  rejected:  { label: "已拒絕", color: "text-red-400 bg-red-900/20 border-red-700/30" },
  completed: { label: "已完成", color: "text-brand-400 bg-brand-900/20 border-brand-700/30" },
  cancelled: { label: "已取消", color: "text-gray-400 bg-gray-800/30 border-gray-700/30" },
};

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待回覆" },
  { key: "accepted", label: "已接受" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已拒絕" },
  { key: "cancelled", label: "已取消" },
];

export default function TradeHistoryPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return setLoading(false);
      setUserId(user.id);
      const res = await fetch("/api/trade/offers");
      if (res.ok) {
        const { offers } = await res.json();
        setOffers(offers ?? []);
      }
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? offers : offers.filter(o => o.status === filter);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/trade" className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">交易紀錄</h1>
          <p className="text-gray-400 text-xs mt-0.5">共 {offers.length} 筆紀錄</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === f.key
                ? "bg-brand-600 border-brand-500 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-gray-200"
            }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-60">({offers.filter(o => o.status === f.key).length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-gray-500 space-y-3">
          <Clock className="w-10 h-10 mx-auto opacity-30" />
          <p>沒有{filter !== "all" ? statusConfig[filter]?.label : ""}的交易紀錄</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(offer => {
            const isSender = offer.from_user_id === userId;
            const other = isSender ? offer.to_profile : offer.from_profile;
            const s = statusConfig[offer.status] ?? statusConfig.pending;
            return (
              <Link
                key={offer.id}
                href={`/trade/offers/${offer.id}`}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:border-brand-700/40 transition-colors block"
              >
                <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold shrink-0">
                  {other?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">
                    {other?.display_name ?? other?.username ?? "未知用戶"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3 h-3" />
                    {isSender ? "我發出的提案" : "我收到的提案"}
                    <span className="opacity-40">·</span>
                    {new Date(offer.created_at).toLocaleDateString("zh-TW")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.color}`}>
                    {s.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
