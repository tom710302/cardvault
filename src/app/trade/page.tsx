"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, Plus, Zap, Users, ChevronRight, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };
const conditionColor: Record<string, string> = { M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400" };

export default function TradePage() {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [recentHaves, setRecentHaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [matchRes, havesRes] = await Promise.all([
        user ? fetch("/api/trade/matches") : Promise.resolve(null),
        fetch("/api/trade/recent"),
      ]);
      if (matchRes?.ok) { const { matches } = await matchRes.json(); setMatches(matches ?? []); }
      if (havesRes?.ok) { const { haves } = await havesRes.json(); setRecentHaves(haves ?? []); }
      setLoading(false);
    }
    load();
  }, [user]);

  const perfectMatches = matches.filter(m => m.perfectMatch);
  const partialMatches = matches.filter(m => !m.perfectMatch);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-brand-400" /> 換卡系統
          </h1>
          <p className="text-gray-400 text-sm mt-1">填寫你有的牌和想要的牌，系統自動配對換卡夥伴</p>
        </div>
        {user ? (
          <div className="flex gap-2">
            <Link href="/trade/offers" className="btn-secondary text-sm flex items-center gap-2">提案信箱</Link>
            <Link href="/trade/my-list" className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> 管理清單</Link>
          </div>
        ) : (
          <Link href="/auth/login" className="btn-primary text-sm">登入後開始換卡</Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-brand-400">{perfectMatches.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">完美配對</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{matches.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">總配對數</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{recentHaves.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">近期可換</div>
        </div>
      </div>

      {/* Matches Section */}
      {user && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> 你的配對結果
            </h2>
            <Link href="/trade/matches" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              全部配對 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-32 shimmer" />)}
            </div>
          ) : matches.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-gray-500 space-y-3">
              <ArrowLeftRight className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm">還沒有配對結果</p>
              <p className="text-xs text-gray-600">先到「管理清單」填寫你有的牌和想要的牌</p>
              <Link href="/trade/my-list" className="btn-primary text-sm inline-flex gap-2 mt-2"><Plus className="w-4 h-4" /> 管理清單</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.slice(0, 6).map((match: any) => (
                <Link href={`/trade/matches?user=${match.uid}`} key={match.uid}
                  className="glass rounded-xl p-4 card-hover group block space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {match.user?.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{match.user?.display_name ?? match.user?.username}</div>
                      {match.perfectMatch && (
                        <span className="text-xs text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3" /> 完美配對</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {match.theyHaveForMe.length > 0 && (
                      <div className="text-gray-400">
                        <span className="text-green-400 font-medium">他有你要的：</span>
                        {match.theyHaveForMe.slice(0, 2).map((h: any) => h.card_name).join("、")}
                        {match.theyHaveForMe.length > 2 && ` +${match.theyHaveForMe.length - 2}`}
                      </div>
                    )}
                    {match.theyWantFromMe.length > 0 && (
                      <div className="text-gray-400">
                        <span className="text-blue-400 font-medium">他想要你的：</span>
                        {match.theyWantFromMe.slice(0, 2).map((w: any) => w.card_name).join("、")}
                        {match.theyWantFromMe.length > 2 && ` +${match.theyWantFromMe.length - 2}`}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recent available cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" /> 近期可換卡牌
          </h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-40 shimmer" />)}
          </div>
        ) : recentHaves.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-gray-500 text-sm">目前還沒有人登記可換卡牌</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {recentHaves.slice(0, 10).map((have: any) => (
              <Link href={`/users/${have.user_id}`} key={have.id} className="glass rounded-xl overflow-hidden card-hover group block">
                <div className="h-28 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-4xl">
                  {have.image_url
                    ? <img src={have.image_url} alt={have.card_name} className="w-full h-full object-cover" />
                    : (gameEmoji[have.card_game] ?? "🃏")}
                </div>
                <div className="p-2.5 space-y-1">
                  <div className="text-xs font-semibold text-white line-clamp-2 leading-snug">{have.card_name}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${conditionColor[have.condition] ?? "text-gray-400"}`}>{have.condition}</span>
                    <span className="text-[10px] text-gray-600">{have.card_game}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
