"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, Star, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const conditionColor: Record<string, string> = { M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400" };

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return setLoading(false);
      const res = await fetch("/api/trade/matches");
      if (res.ok) { const { matches } = await res.json(); setMatches(matches ?? []); }
      setLoading(false);
    });
  }, []);

  const perfect = matches.filter(m => m.perfectMatch);
  const partial = matches.filter(m => !m.perfectMatch);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trade" className="text-gray-400 hover:text-gray-200"><ArrowLeftRight className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">配對結果</h1>
          <p className="text-gray-400 text-sm mt-0.5">根據你的清單自動配對</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-28 shimmer" />)}</div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-gray-500 space-y-3">
          <ArrowLeftRight className="w-12 h-12 mx-auto opacity-30" />
          <p>還沒有配對結果</p>
          <p className="text-xs text-gray-600">先到「管理清單」填寫你有的牌和想要的牌</p>
          <Link href="/trade/my-list" className="btn-primary text-sm inline-flex gap-2 mt-2"><Plus className="w-4 h-4" />建立清單</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {perfect.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-yellow-400 flex items-center gap-1.5 mb-3">
                <Star className="w-4 h-4" /> 完美配對（{perfect.length}）— 雙方都有對方要的牌
              </h2>
              <div className="space-y-3">
                {perfect.map(m => <MatchCard key={m.uid} match={m} />)}
              </div>
            </div>
          )}
          {partial.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">單向配對（{partial.length}）</h2>
              <div className="space-y-3">
                {partial.map(m => <MatchCard key={m.uid} match={m} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
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
    </div>
  );
}
