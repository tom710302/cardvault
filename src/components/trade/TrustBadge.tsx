"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface TradeStats {
  completed_trades: number;
  incomplete_trades: number;
  avg_rating: number | null;
  review_count: number;
  incomplete_rate: number;
}

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

  const isNewbie = stats.completed_trades < 3;
  const isVeteran = stats.completed_trades >= 10;
  const hasWarning = stats.incomplete_rate >= 30 && stats.completed_trades + stats.incomplete_trades >= 3;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 完成次數 */}
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
          <ShieldCheck className="w-3 h-3 text-green-400" />
          {stats.completed_trades} 次換卡
        </span>
        {/* 評分 */}
        {stats.review_count > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400" />
            {stats.avg_rating?.toFixed(1)}
          </span>
        )}
        {/* 標籤 */}
        {isNewbie && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/30">新手</span>
        )}
        {isVeteran && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800/30">老手</span>
        )}
        {hasWarning && (
          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
            <AlertTriangle className="w-3 h-3" /> 未完成率高
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 完成次數徽章 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-sm">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span className="text-white font-medium">{stats.completed_trades}</span>
        <span className="text-gray-500">次換卡完成</span>
      </div>

      {/* 評分 */}
      {stats.review_count > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-sm">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-white font-medium">{stats.avg_rating?.toFixed(1)}</span>
          <span className="text-gray-500">({stats.review_count} 評價)</span>
        </div>
      )}

      {/* 新手 / 老手 */}
      {isNewbie && (
        <span className="px-3 py-1.5 rounded-full text-sm bg-blue-900/30 text-blue-400 border border-blue-800/30">
          🌱 新手
        </span>
      )}
      {isVeteran && (
        <span className="px-3 py-1.5 rounded-full text-sm bg-yellow-900/30 text-yellow-400 border border-yellow-800/30">
          ⭐ 老手
        </span>
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
