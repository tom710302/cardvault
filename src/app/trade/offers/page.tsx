"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Clock, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "待回覆", color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30", icon: Clock },
  accepted:  { label: "已接受", color: "text-green-400 bg-green-900/20 border-green-700/30", icon: CheckCircle },
  rejected:  { label: "已拒絕", color: "text-red-400 bg-red-900/20 border-red-700/30", icon: XCircle },
  completed: { label: "已完成", color: "text-brand-400 bg-brand-900/20 border-brand-700/30", icon: CheckCircle },
  cancelled: { label: "已取消", color: "text-gray-400 bg-gray-800/30 border-gray-700/30", icon: XCircle },
};

export default function OffersPage() {
  const [user, setUser] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/trade/offers").then(r => r.json()).then(({ offers }) => { setOffers(offers ?? []); setLoading(false); });
  }, [user]);

  const incoming = offers.filter(o => o.to_user_id === user?.id);
  const outgoing = offers.filter(o => o.from_user_id === user?.id);
  const shown = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trade" className="text-gray-400 hover:text-gray-200"><ArrowLeftRight className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-white">換卡提案</h1>
      </div>

      <div className="flex gap-2">
        {(["incoming", "outgoing"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
            {t === "incoming" ? `收到的提案 (${incoming.length})` : `發出的提案 (${outgoing.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}</div>
      ) : shown.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-gray-500 text-sm">沒有{tab === "incoming" ? "收到的" : "發出的"}提案</div>
      ) : (
        <div className="space-y-3">
          {shown.map(offer => {
            const s = statusConfig[offer.status] ?? statusConfig.pending;
            const Icon = s.icon;
            const other = tab === "incoming" ? offer.from_profile : offer.to_profile;
            return (
              <Link href={`/trade/offers/${offer.id}`} key={offer.id}
                className="glass rounded-xl p-4 flex items-center gap-4 card-hover group block">
                <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold shrink-0">
                  {other?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{other?.display_name ?? other?.username}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{new Date(offer.created_at).toLocaleDateString("zh-TW")}</div>
                  {offer.message && <div className="text-xs text-gray-400 mt-1 truncate">「{offer.message}」</div>}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border shrink-0 ${s.color}`}>
                  <Icon className="w-3 h-3" /> {s.label}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
