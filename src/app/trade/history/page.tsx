"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ChevronRight, ArrowLeftRight, Star, Trophy, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "待回覆", color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30" },
  accepted:  { label: "進行中", color: "text-blue-400 bg-blue-900/20 border-blue-700/30" },
  rejected:  { label: "已拒絕", color: "text-red-400 bg-red-900/20 border-red-700/30" },
  completed: { label: "已完成", color: "text-green-400 bg-green-900/20 border-green-700/30" },
  cancelled: { label: "已取消", color: "text-gray-400 bg-gray-800/30 border-gray-700/30" },
};

const FILTERS = [
  { key: "all",       label: "全部" },
  { key: "completed", label: "已完成" },
  { key: "pending",   label: "待回覆" },
  { key: "accepted",  label: "進行中" },
  { key: "rejected",  label: "已拒絕" },
  { key: "cancelled", label: "已取消" },
];

const tierColor: Record<string, string> = {
  "新手": "text-gray-400",
  "老手": "text-blue-400",
  "收藏家": "text-purple-400",
  "卡牌大師": "text-yellow-400",
};

export default function TradeHistoryPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return setLoading(false);
      setUserId(user.id);
      const [offersRes, statsRes] = await Promise.all([
        fetch("/api/trade/offers"),
        fetch(`/api/trade/stats/${user.id}`),
      ]);
      if (offersRes.ok) { const { offers } = await offersRes.json(); setOffers(offers ?? []); }
      if (statsRes.ok) { const { stats } = await statsRes.json(); setStats(stats); }
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? offers : offers.filter(o => o.status === filter);
  const completedCount = offers.filter(o => o.status === "completed").length;
  const successRate = offers.length > 0 ? Math.round((completedCount / offers.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/trade" className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">交易紀錄</h1>
          <p className="text-gray-400 text-xs mt-0.5">共 {offers.length} 筆紀錄</p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4 text-center space-y-1">
            <Trophy className="w-5 h-5 mx-auto text-green-400" />
            <div className="text-xl font-bold text-white">{stats.completed_trades ?? 0}</div>
            <div className="text-xs text-gray-500">成功換卡</div>
          </div>
          <div className="glass rounded-xl p-4 text-center space-y-1">
            <TrendingUp className="w-5 h-5 mx-auto text-brand-400" />
            <div className="text-xl font-bold text-white">{successRate}%</div>
            <div className="text-xs text-gray-500">成功率</div>
          </div>
          <div className="glass rounded-xl p-4 text-center space-y-1">
            <Star className="w-5 h-5 mx-auto text-yellow-400" />
            <div className={cn("text-base font-bold", tierColor[stats.tier] ?? "text-gray-400")}>{stats.tier}</div>
            <div className="text-xs text-gray-500">
              {stats.avg_rating ? `⭐ ${Number(stats.avg_rating).toFixed(1)}` : "尚無評分"}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filter === f.key
                ? "bg-brand-600 border-brand-500 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-gray-200"
            )}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-60">({offers.filter(o => o.status === f.key).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 shimmer" />)}
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
            const myCards: any[] = isSender ? (offer.items?.offer ?? []) : (offer.items?.request ?? []);
            const theirCards: any[] = isSender ? (offer.items?.request ?? []) : (offer.items?.offer ?? []);

            return (
              <Link
                key={offer.id}
                href={`/trade/offers/${offer.id}`}
                className="glass rounded-xl p-4 flex items-start gap-3 hover:border-brand-700/40 transition-colors block"
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {other?.avatar_url
                    ? <img src={other.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-sm">
                        {(other?.display_name || other?.username)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-sm truncate">
                      {other?.display_name ?? other?.username ?? "未知用戶"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", s.color)}>{s.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>

                  {/* Cards summary */}
                  {(myCards.length > 0 || theirCards.length > 0) ? (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                      <span className="truncate max-w-[100px] text-gray-300">
                        {myCards.length > 0 ? myCards.map((c: any) => c.card_name).join("、") : "—"}
                      </span>
                      <ArrowLeftRight className="w-3 h-3 shrink-0 text-gray-600" />
                      <span className="truncate max-w-[100px] text-gray-300">
                        {theirCards.length > 0 ? theirCards.map((c: any) => c.card_name).join("、") : "—"}
                      </span>
                    </div>
                  ) : offer.message ? (
                    <p className="text-xs text-gray-500 mt-1 truncate">{offer.message}</p>
                  ) : null}

                  <div className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isSender ? "我發出" : "我收到"} · {new Date(offer.created_at).toLocaleDateString("zh-TW")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
