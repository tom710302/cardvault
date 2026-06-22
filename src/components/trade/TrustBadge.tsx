"use client";

import { useEffect, useRef, useState } from "react";
import { Star, ShieldAlert, X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";

interface TradeStats {
  completed_trades: number;
  incomplete_trades: number;
  avg_rating: number | null;
  review_count: number;
  incomplete_rate: number;
  tier: "新手" | "老手" | "收藏家" | "卡牌大師";
}

const TIERS = {
  "新手":    { icon: "🌱", color: "text-blue-400",   border: "border-blue-800/30",   bg: "bg-blue-900/20",   range: "0 – 2 次",       limit: "每日 3 則提案",   perks: ["基本換卡功能", "顯示新手標籤"] },
  "老手":    { icon: "🃏", color: "text-green-400",  border: "border-green-800/30",  bg: "bg-green-900/20",  range: "3 – 9 次",        limit: "每日 10 則提案",  perks: ["顯示老手標籤", "評分顯示", "個人主頁換卡展示"] },
  "收藏家":  { icon: "⭐", color: "text-yellow-400", border: "border-yellow-800/30", bg: "bg-yellow-900/20", range: "10 – 29 次",       limit: "無限則提案",      perks: ["黃色徽章", "配對優先排序", "無限提案"] },
  "卡牌大師":{ icon: "👑", color: "text-orange-400", border: "border-orange-800/30", bg: "bg-orange-900/20", range: "30 次以上 + ★4.5↑", limit: "無限則提案",      perks: ["橘金徽章（最顯眼）", "配對清單最前排", "未來：優先刊登", "未來：賣家/代尋功能"] },
} as const;

const TIER_ORDER = ["新手", "老手", "收藏家", "卡牌大師"] as const;

function TierModal({ currentTier, onClose }: { currentTier: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: "#0f0f14", border: "1px solid #2a2a3a" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">換卡等級系統</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-white/5">
          {TIER_ORDER.map(name => {
            const t = TIERS[name];
            const isCurrentTier = name === currentTier;
            return (
              <div key={name} className={`p-4 space-y-3 ${isCurrentTier ? "bg-white/5" : ""}`}>
                {/* Icon + name */}
                <div className="text-center space-y-1">
                  <div className="text-2xl">{t.icon}</div>
                  <div className={`text-sm font-bold ${t.color}`}>{name}</div>
                  <div className="text-[10px] text-gray-600">{t.range}</div>
                </div>

                {/* Current indicator */}
                {isCurrentTier && (
                  <div className={`text-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.bg} ${t.color}`}>
                    目前等級
                  </div>
                )}

                {/* Limit */}
                <div className={`text-center text-[10px] px-2 py-1 rounded-lg ${t.bg} ${t.color} font-medium`}>
                  {t.limit}
                </div>

                {/* Perks */}
                <ul className="space-y-1">
                  {t.perks.map(p => (
                    <li key={p} className="text-[10px] text-gray-400 flex items-start gap-1">
                      <span className={`shrink-0 mt-px ${t.color}`}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-white/5 text-center text-[10px] text-gray-600">
          完成換卡並獲得好評即可升級
        </div>
      </div>
    </div>
  );
}

interface Props {
  userId: string;
  size?: "sm" | "md";
}

export function TrustBadge({ userId, size = "md" }: Props) {
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    fetch(`/api/trade/stats/${userId}`)
      .then(r => r.json())
      .then(({ stats }) => setStats(stats));
  }, [userId]);

  function startPress() {
    setPressing(true);
    timerRef.current = setTimeout(() => { setShowModal(true); setPressing(false); }, 2000);
  }
  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
  }

  if (!stats) return null;

  const tier = TIERS[stats.tier];
  const hasWarning = stats.incomplete_rate >= 30 && stats.completed_trades + stats.incomplete_trades >= 3;

  const tierBadgeProps = {
    onMouseDown: startPress,
    onMouseUp: cancelPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: cancelPress,
    style: { cursor: "pointer", userSelect: "none" as const },
    title: "長按 2 秒查看等級說明",
  };

  if (size === "sm") {
    return (
      <>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            {...tierBadgeProps}
            className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-opacity select-none ${tier.bg} ${tier.color} ${tier.border} ${pressing ? "opacity-60" : ""}`}
          >
            {tier.icon} {stats.tier}
          </span>
          <span className="text-[10px] text-gray-500">{stats.completed_trades} 次換卡</span>
          {stats.review_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
              <Star className="w-3 h-3 fill-yellow-400" />
              {stats.avg_rating?.toFixed(1)}
            </span>
          )}
          {hasWarning && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
              <ShieldAlert className="w-3 h-3" /> 未完成率高
            </span>
          )}
        </div>
        {showModal && <TierModal currentTier={stats.tier} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div
          {...tierBadgeProps}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-opacity select-none ${tier.bg} ${tier.color} ${tier.border} ${pressing ? "opacity-60" : ""}`}
        >
          <span className="text-base">{tier.icon}</span>
          {stats.tier}
          <span className="text-[10px] opacity-50 font-normal">長按查看</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-sm">
          <span className="text-white font-medium">{stats.completed_trades}</span>
          <span className="text-gray-500">次換卡完成</span>
        </div>

        {stats.review_count > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-sm">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-medium">{stats.avg_rating?.toFixed(1)}</span>
            <span className="text-gray-500">({stats.review_count} 評價)</span>
          </div>
        )}

        {hasWarning && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-900/20 border border-red-800/30 text-sm text-red-400">
            <ShieldAlert className="w-4 h-4" />
            未完成率 {stats.incomplete_rate}%
          </div>
        )}
      </div>
      {showModal && <TierModal currentTier={stats.tier} onClose={() => setShowModal(false)} />}
    </>
  );
}
