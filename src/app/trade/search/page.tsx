"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Package, Bookmark, ArrowLeftRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

const GAMES = ["全部", "寶可夢", "MTG", "遊戲王", "NBA", "MLB"];
const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };
const conditionColor: Record<string, string> = {
  M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400",
};

interface TradeItem {
  id: string;
  card_name: string;
  card_game: string;
  condition?: string;
  condition_min?: string;
  image_url?: string | null;
  note?: string | null;
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
}

function TradeSearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [game, setGame] = useState("全部");
  const [tab, setTab] = useState<"haves" | "wants">("haves");
  const [haves, setHaves] = useState<TradeItem[]>([]);
  const [wants, setWants] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [offerSending, setOfferSending] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  // Initial search from URL param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) search(q, "全部");
  }, []);

  const search = useCallback(async (q: string, g: string) => {
    if (!q.trim()) { setHaves([]); setWants([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ q });
    if (g !== "全部") params.set("game", g);
    const res = await fetch(`/api/trade/search?${params}`);
    if (res.ok) {
      const data = await res.json();
      setHaves(data.haves ?? []);
      setWants(data.wants ?? []);
    }
    setLoading(false);
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, game), 300);
  }

  function handleGameChange(g: string) {
    setGame(g);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, g), 100);
  }

  async function sendOffer(toUserId: string, cardName: string) {
    if (!currentUserId) { toast.error("請先登入"); return; }
    setOfferSending(toUserId);
    const res = await fetch("/api/trade/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_user_id: toUserId, message: `我對「${cardName}」有興趣，想和你換卡！` }),
    });
    if (res.ok) {
      const { offer } = await res.json();
      toast.success("換卡提案已送出！");
      window.location.href = `/trade/offers/${offer.id}`;
    } else {
      const { error } = await res.json();
      toast.error(error ?? "送出失敗");
    }
    setOfferSending(null);
  }

  const displayList = tab === "haves" ? haves : wants;
  const hasResults = haves.length > 0 || wants.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-brand-400" /> 換卡搜尋
        </h1>
        <p className="text-gray-400 text-sm mt-1">輸入卡名，找出社群中有這張卡或在找這張卡的人</p>
      </div>

      {/* Search bar */}
      <div className="glass rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="輸入卡牌名稱，例：比卡超、Black Lotus..."
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100"
          />
          {query && (
            <button onClick={() => { setQuery(""); setHaves([]); setWants([]); }} className="text-gray-600 hover:text-gray-300 text-xs">✕</button>
          )}
        </div>

        {/* Game filter */}
        <div className="flex gap-2 flex-wrap">
          {GAMES.map(g => (
            <button key={g} onClick={() => handleGameChange(g)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                game === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              )}>
              {gameEmoji[g] ?? ""} {g}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {query.trim() && (
        <>
          {/* Tab bar + counts */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit">
            <button onClick={() => setTab("haves")}
              className={cn("px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                tab === "haves" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
              )}>
              <Package className="w-4 h-4" /> 有這張卡
              {haves.length > 0 && <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", tab === "haves" ? "bg-white/20" : "bg-brand-600/40 text-brand-300")}>{haves.length}</span>}
            </button>
            <button onClick={() => setTab("wants")}
              className={cn("px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                tab === "wants" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
              )}>
              <Bookmark className="w-4 h-4" /> 在找這張卡
              {wants.length > 0 && <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", tab === "wants" ? "bg-white/20" : "bg-brand-600/40 text-brand-300")}>{wants.length}</span>}
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}
            </div>
          ) : !hasResults ? (
            <div className="text-center py-16 text-gray-500 space-y-3">
              <ArrowLeftRight className="w-10 h-10 mx-auto opacity-30" />
              <p>找不到「{query}」的換卡紀錄</p>
              <Link href="/trade/my-list" className="btn-primary text-sm inline-flex items-center gap-2 mt-2">
                <Package className="w-4 h-4" /> 登記我有這張卡
              </Link>
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>沒有{tab === "haves" ? "持有" : "想要"}「{query}」的紀錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayList.map(item => {
                const profile = item.profiles;
                const isSelf = profile?.id === currentUserId;
                const cond = tab === "haves" ? item.condition : item.condition_min;
                return (
                  <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4">
                    {/* Card image */}
                    {tab === "haves" && item.image_url ? (
                      <img src={item.image_url} alt={item.card_name} className="w-12 h-16 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 text-gray-600 text-lg">
                        {gameEmoji[item.card_game] ?? "🃏"}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{item.card_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{item.card_game}</span>
                        {cond && (
                          <span className={cn("text-xs font-bold", conditionColor[cond] ?? "text-gray-400")}>
                            {tab === "wants" ? "最低 " : ""}{cond}
                          </span>
                        )}
                      </div>
                      {item.note && <p className="text-xs text-gray-500 mt-1 truncate">{item.note}</p>}
                      {/* User */}
                      {profile && (
                        <Link href={`/users/${profile.id}`} className="flex items-center gap-1.5 mt-2 w-fit hover:opacity-80">
                          {profile.avatar_url
                            ? <img src={profile.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                            : <div className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-[10px] text-white font-bold">{(profile.display_name || profile.username)?.[0]?.toUpperCase()}</div>
                          }
                          <span className="text-xs text-gray-400">{profile.display_name || profile.username}</span>
                        </Link>
                      )}
                    </div>

                    {/* Action */}
                    {!isSelf && profile && (
                      <button
                        onClick={() => sendOffer(profile.id, item.card_name)}
                        disabled={offerSending === profile.id}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 text-xs font-medium border border-brand-700/30 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {offerSending === profile.id ? "送出中" : "提案換卡"}
                      </button>
                    )}
                    {isSelf && (
                      <span className="text-xs text-gray-600 shrink-0">你的卡</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Empty state (no query) */}
      {!query.trim() && (
        <div className="text-center py-16 text-gray-600 space-y-2">
          <Search className="w-12 h-12 mx-auto opacity-20" />
          <p className="text-sm">輸入卡名開始搜尋</p>
        </div>
      )}
    </div>
  );
}

export default function TradeSearchPage() {
  return (
    <Suspense>
      <TradeSearchContent />
    </Suspense>
  );
}
