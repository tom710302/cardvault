"use client";

import { useEffect, useState } from "react";
import { Star, ShieldAlert } from "lucide-react";

interface TradeStats {
  completed_trades: number;
  incomplete_trades: number;
  avg_rating: number | null;
  review_count: number;
  incomplete_rate: number;
  tier: "新手" | "老手" | "收藏家" | "卡牌大師";
}

const TIERS = {
  "新手":   { icon: "🌱", color: "text-blue-400",   border: "border-blue-800/30",   bg: "bg-blue-900/20"   },
  "老手":   { icon: "🃏", color: "text-green-400",  border: "border-green-800/30",  bg: "bg-green-900/20"  },
  "收藏家": { icon: "⭐", color: "text-yellow-400", border: "border-yellow-800/30", bg: "bg-yellow-900/20" },
  "卡牌大師":{ icon: "👑", color: "text-orange-400", border: "border-orange-800/30", bg: "bg-orange-900/20" },
};

interface Props {
  userId: string;
  size?: "sm" | "md";
}

export function TrustBadge({ userId, size = "md" }: Props) {
  const [stats, setStats] = useState<TradeStats | null>(null);

  useEffect(() => {
    fetch(`/api/trade/stats/${userId}`)
      .then(r => r.json())
      .then(({ stats }) => setStats(stats));
  }, [userId]);

  if (!stats) return null;

  const tier = TIERS[stats.tier];
  const hasWarning = stats.incomplete_rate >= 30 && stats.completed_trades + stats.incomplete_trades >= 3;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 等級徽章 */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tier.bg} ${tier.color} ${tier.border}`}>
          {tier.icon} {stats.tier}
        </span>
        {/* 完成次數 */}
        <span className="text-[10px] text-gray-500">
          {stats.completed_trades} 次換卡
        </span>
        {/* 評分 */}
        {stats.review_count > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400" />
            {stats.avg_rating?.toFixed(1)}
          </span>
        )}
        {/* 未完成率警示 */}
        {hasWarning && (
          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
            <ShieldAlert className="w-3 h-3" /> 未完成率高
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 等級徽章（大） */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${tier.bg} ${tier.color} ${tier.border}`}>
        <span className="text-base">{tier.icon}</span>
        {stats.tier}
      </div>

      {/* 完成次數 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-sm">
        <span className="text-white font-medium">{stats.completed_trades}</span>
        <span className="text-gray-500">次換卡完成</span>
      </div>

      {/* 評分 */}
      {stats.review_count > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-sm">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-white font-medium">{stats.avg_rating?.toFixed(1)}</span>
          <span className="text-gray-500">({stats.review_count} 評價)</span>
        </div>
      )}

      {/* 未完成率警示 */}
      {hasWarning && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-900/20 border border-red-800/30 text-sm text-red-400">
          <ShieldAlert className="w-4 h-4" />
          未完成率 {stats.incomplete_rate}%
        </div>
      )}
    </div>
  );
}
