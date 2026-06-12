"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, Star, ChevronRight, Plus, Send, X, Lock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TrustBadge } from "@/components/trade/TrustBadge";

const conditionColor: Record<string, string> = { M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400" };

interface DailyQuota { tier: string; limit: number | null; used_today: number; remaining: number | null; }

// ── 發送提案 Modal ──────────────────────────────────────────────
function SendOfferModal({ match, quota, onClose, onSent }: {
  match: any;
  quota: DailyQuota;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const isLimited = quota.remaining !== null && quota.remaining <= 0;

  async function send() {
    setSending(true); setError("");
    const res = await fetch("/api/trade/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_user_id: match.uid,
        offer_have_ids: match.theyWantFromMe.map((h: any) => h.id),
        request_have_ids: match.theyHaveForMe.map((h: any) => h.id),
        message: message.trim() || null,
      }),
    });
    if (res.ok) { onSent(); onClose(); }
    else {
      const { error } = await res.json();
      setError(error ?? "發送失敗，請稍後再試");
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0f0f14", border: "1px solid #2a2a3a" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-brand-400" />
            發送換卡提案給 {match.user?.display_name ?? match.user?.username}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Daily quota bar */}
        {quota.limit !== null && (
          <div className={`px-5 py-3 border-b border-white/5 flex items-center justify-between text-xs ${isLimited ? "bg-red-900/20" : "bg-white/3"}`}>
            <span className={isLimited ? "text-red-400 font-medium" : "text-gray-500"}>
              {isLimited
                ? "⛔ 今日提案次數已用完"
                : `今日剩餘 ${quota.remaining} / ${quota.limit} 次提案`
              }
            </span>
            {isLimited && (
              <span className="text-gray-500 text-[10px]">升級等級可增加次數</span>
            )}
            {!isLimited && quota.remaining !== null && quota.remaining <= 2 && (
              <span className="text-orange-400 text-[10px]">即將用完</span>
            )}
          </div>
        )}

        {/* 上限已到：升級提示 */}
        {isLimited ? (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <div>
              <p className="text-white font-semibold">今日 {quota.tier} 提案次數已達上限</p>
              <p className="text-gray-500 text-sm mt-1">
                {quota.tier === "新手" ? "升級到老手（完成 3 次換卡）可每日發送 10 則" : "升級到收藏家（完成 10 次換卡）可無限發送"}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={onClose} className="btn-secondary text-sm px-5 py-2">明天再試</button>
              <Link href="/trade/my-list" onClick={onClose} className="btn-primary text-sm px-5 py-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 去累積換卡次數
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Cards summary */}
            <div className="grid grid-cols-2 gap-3">
              {match.theyWantFromMe.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-blue-400">你提供的：</div>
                  {match.theyWantFromMe.slice(0, 3).map((h: any) => (
                    <div key={h.id} className="text-[10px] bg-blue-900/10 border border-blue-800/30 rounded-lg px-2 py-1 text-gray-200 truncate">{h.card_name}</div>
                  ))}
                  {match.theyWantFromMe.length > 3 && <div className="text-[10px] text-gray-600">+{match.theyWantFromMe.length - 3} 張</div>}
                </div>
              )}
              {match.theyHaveForMe.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-green-400">你想換的：</div>
                  {match.theyHaveForMe.slice(0, 3).map((h: any) => (
                    <div key={h.id} className="text-[10px] bg-green-900/10 border border-green-800/30 rounded-lg px-2 py-1 text-gray-200 truncate">{h.card_name}</div>
                  ))}
                  {match.theyHaveForMe.length > 3 && <div className="text-[10px] text-gray-600">+{match.theyHaveForMe.length - 3} 張</div>}
                </div>
              )}
            </div>

            {/* Message */}
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="附上留言（選填），例如：我的皮卡丘是 NM 品相，可以確認一下嗎？"
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />

            {error && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

            <button onClick={send} disabled={sending}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {sending ? "發送中…" : "確認發送提案"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主頁面 ──────────────────────────────────────────────────────
export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<DailyQuota>({ tier: "新手", limit: 3, used_today: 0, remaining: 3 });
  const [activeOffer, setActiveOffer] = useState<any>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return setLoading(false);
      const [matchRes, quotaRes] = await Promise.all([
        fetch("/api/trade/matches"),
        fetch("/api/trade/offers/remaining"),
      ]);
      if (matchRes.ok) { const { matches } = await matchRes.json(); setMatches(matches ?? []); }
      if (quotaRes.ok) { const q = await quotaRes.json(); setQuota(q); }
      setLoading(false);
    });
  }, []);

  function handleSent(uid: string) {
    setSentIds(prev => new Set(Array.from(prev).concat(uid)));
    setQuota(q => ({ ...q, used_today: q.used_today + 1, remaining: q.remaining !== null ? Math.max(0, q.remaining - 1) : null }));
  }

  const perfect = matches.filter(m => m.perfectMatch);
  const partial = matches.filter(m => !m.perfectMatch);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/trade" className="text-gray-400 hover:text-gray-200"><ArrowLeftRight className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">配對結果</h1>
            <p className="text-gray-400 text-sm mt-0.5">根據你的清單自動配對</p>
          </div>
        </div>

        {/* Quota badge */}
        {quota.limit !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            (quota.remaining ?? 1) <= 0
              ? "bg-red-900/20 border-red-800/30 text-red-400"
              : (quota.remaining ?? 3) <= 2
              ? "bg-orange-900/20 border-orange-800/30 text-orange-400"
              : "bg-white/5 border-white/10 text-gray-400"
          }`}>
            {(quota.remaining ?? 0) <= 0
              ? <Lock className="w-3 h-3" />
              : <Send className="w-3 h-3" />
            }
            今日剩餘 {quota.remaining} / {quota.limit} 次
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-28 shimmer" />)}</div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-gray-500 space-y-3">
          <ArrowLeftRight className="w-12 h-12 mx-auto opacity-30" />
          <p>還沒有配對結果</p>
          <p className="text-xs text-gray-600">先到「管理清單」填寫你有的牌和想要的牌</p>
          <Link href="/trade/my-list" className="btn-primary text-sm inline-flex gap-2 mt-2"><Plus className="w-4 h-4" /> 管理清單</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {perfect.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-yellow-400 flex items-center gap-1.5 mb-3">
                <Star className="w-4 h-4" /> 完美配對（{perfect.length}）— 雙方都有對方要的牌
              </h2>
              <div className="space-y-3">
                {perfect.map(m => (
                  <MatchCard key={m.uid} match={m} quota={quota} sent={sentIds.has(m.uid)}
                    onSend={() => setActiveOffer(m)} />
                ))}
              </div>
            </div>
          )}
          {partial.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">單向配對（{partial.length}）</h2>
              <div className="space-y-3">
                {partial.map(m => (
                  <MatchCard key={m.uid} match={m} quota={quota} sent={sentIds.has(m.uid)}
                    onSend={() => setActiveOffer(m)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeOffer && (
        <SendOfferModal
          match={activeOffer}
          quota={quota}
          onClose={() => setActiveOffer(null)}
          onSent={() => handleSent(activeOffer.uid)}
        />
      )}
    </div>
  );
}

function MatchCard({ match, quota, sent, onSend }: { match: any; quota: DailyQuota; sent: boolean; onSend: () => void }) {
  const isLimited = quota.remaining !== null && quota.remaining <= 0;

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold shrink-0">
            {match.user?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="font-semibold text-white">{match.user?.display_name ?? match.user?.username}</div>
            {match.perfectMatch && <div className="text-xs text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3" /> 完美配對</div>}
            <TrustBadge userId={match.uid} size="sm" />
          </div>
        </div>
        <Link href={`/users/${match.uid}`} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 shrink-0">
          查看主頁 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {match.theyHaveForMe.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-green-400">他有你要的：</div>
            {match.theyHaveForMe.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between bg-green-900/10 border border-green-800/30 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-gray-200 truncate">{h.card_name}</span>
                <span className={`shrink-0 ml-2 font-bold ${conditionColor[h.condition]}`}>{h.condition}</span>
              </div>
            ))}
          </div>
        )}
        {match.theyWantFromMe.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-blue-400">他想要你的：</div>
            {match.theyWantFromMe.map((w: any) => (
              <div key={w.id} className="flex items-center bg-blue-900/10 border border-blue-800/30 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-gray-200 truncate">{w.card_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="pt-1">
        {sent ? (
          <div className="w-full text-center text-xs text-green-400 py-2 bg-green-900/10 border border-green-800/30 rounded-xl">
            ✓ 提案已發送
          </div>
        ) : isLimited ? (
          <button onClick={onSend}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-red-400 bg-red-900/10 border border-red-800/30 hover:bg-red-900/20 transition-colors">
            <Lock className="w-3.5 h-3.5" /> 今日次數已用完 — 點擊查看升級方式
          </button>
        ) : (
          <button onClick={onSend}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2 py-2">
            <Send className="w-4 h-4" /> 發送換卡提案
          </button>
        )}
      </div>
    </div>
  );
}
