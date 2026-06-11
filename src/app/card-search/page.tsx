"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, ChevronDown, Heart, Package, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */
interface Card {
  id: string; name: string; name_en: string | null; game: string; card_type: string;
  set_name: string | null; rarity: string | null; image_url: string | null; description: string | null;
}
interface ShowcaseUser {
  id: string; username: string; display_name: string | null;
  reputation: number; avatar_url: string | null;
  collection_count: number; collections: any[];
}

/* ─── Constants ─── */
const games = ["全部", "MTG", "寶可夢", "遊戲王", "NBA", "MLB"];
const sortOptions = [
  { value: "name", label: "名稱排序" },
  { value: "game", label: "遊戲排序" },
  { value: "rarity", label: "稀有度" },
];
const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾", NFL: "🏈" };

/* ═══════════════════════════════════════════════════ */
function CardSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") ?? "database") as "database" | "showcase";

  function setTab(t: "database" | "showcase") {
    router.replace(`/card-search?tab=${t}`);
  }

  const supabase = createClient();

  /* ─── Database tab state ─── */
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("全部");
  const [selectedSet, setSelectedSet] = useState("全部");
  const [pokemonSets, setPokemonSets] = useState<string[]>([]);
  const [sort, setSort] = useState("name");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  /* ─── Showcase tab state ─── */
  const [showcaseFilter, setShowcaseFilter] = useState("all");
  const [users, setUsers] = useState<ShowcaseUser[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);

  /* ─── Fetch pokemon sets ─── */
  useEffect(() => {
    supabase.from("cards").select("set_name").eq("game", "寶可夢").eq("is_active", true).not("set_name", "is", null)
      .then(({ data }) => {
        if (data) {
          const seen = new Set<string>();
          setPokemonSets(data.map(d => d.set_name as string).filter(s => s && !seen.has(s) && seen.add(s)).sort());
        }
      });
  }, []);

  function handleGameChange(g: string) {
    if (g === "寶可夢" && game === "寶可夢") { setGame("全部"); } else { setGame(g); }
    setSelectedSet("全部");
  }

  /* ─── Fetch cards ─── */
  const fetchCards = useCallback(async () => {
    setCardsLoading(true);
    let url = `/api/cards?limit=200`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (game !== "全部") url += `&game=${encodeURIComponent(game)}`;
    if (game === "寶可夢" && selectedSet !== "全部") url += `&set_name=${encodeURIComponent(selectedSet)}`;
    const res = await fetch(url);
    if (res.ok) {
      let { cards } = await res.json();
      if (sort === "game") cards = [...cards].sort((a: Card, b: Card) => a.game.localeCompare(b.game));
      setCards(cards ?? []);
    }
    setCardsLoading(false);
  }, [search, game, selectedSet, sort]);

  useEffect(() => {
    if (tab === "database") { const t = setTimeout(fetchCards, 300); return () => clearTimeout(t); }
  }, [tab, fetchCards]);

  /* ─── Fetch showcase ─── */
  useEffect(() => {
    if (tab !== "showcase") return;
    setShowcaseLoading(true);
    async function load() {
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, reputation, avatar_url")
        .order("reputation", { ascending: false }).limit(12);
      if (!profiles) { setShowcaseLoading(false); return; }
      const withCollections = await Promise.all(profiles.map(async p => {
        const { data: cols, count } = await supabase.from("collections")
          .select("*, cards(id, name, game, rarity)", { count: "exact" })
          .eq("user_id", p.id).eq("visibility", "public").limit(3);
        return { ...p, collection_count: count ?? 0, collections: cols ?? [] };
      }));
      setUsers(withCollections.filter(u => u.collection_count > 0 || u.reputation > 0));
      setShowcaseLoading(false);
    }
    load();
  }, [tab]);

  const filteredUsers = showcaseFilter === "top" ? users.filter(u => u.reputation >= 100) : users;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">卡牌搜尋</h1>
          <p className="text-gray-400 text-sm mt-1">瀏覽卡牌資料庫，或欣賞收藏家的珍藏展示</p>
        </div>
        {tab === "database" && (
          <Link href="/showcase" className="btn-primary flex items-center gap-2 shrink-0 text-sm">
            📸 分享我的收藏
          </Link>
        )}
        {tab === "showcase" && (
          <Link href="/collection" className="btn-primary flex items-center gap-2 shrink-0 text-sm">
            <Star className="w-4 h-4" /> 分享我的收藏
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("database")}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            tab === "database" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
          )}>
          🃏 卡牌資料庫
        </button>
        <button onClick={() => setTab("showcase")}
          className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            tab === "showcase" ? "bg-brand-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
          )}>
          ✨ 收藏展示
        </button>
      </div>

      {/* ═══ DATABASE TAB ═══ */}
      {tab === "database" && (
        <div className="space-y-6">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-gray-500">
            <span className="text-base shrink-0">💡</span>
            <p>卡牌資料庫由管理員統一維護。想分享你的卡牌收藏？切換到
              <button onClick={() => setTab("showcase")} className="text-brand-400 hover:text-brand-300 mx-1">收藏展示</button>
              查看。
            </p>
          </div>

          {/* Filters */}
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1 focus-within:ring-2 focus-within:ring-brand-500">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋卡牌名稱..."
                  className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setView("grid")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "grid" ? "bg-brand-600 text-white" : "btn-secondary")}>⊞</button>
                <button onClick={() => setView("list")} className={cn("px-3 py-2 rounded-lg text-sm transition-colors", view === "list" ? "bg-brand-600 text-white" : "btn-secondary")}>☰</button>
              </div>
            </div>

            {/* 遊戲分類 */}
            <div className="flex gap-2 flex-wrap">
              {games.map(g => (
                <button key={g} onClick={() => handleGameChange(g)}
                  className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1",
                    game === g ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                  )}>
                  {gameEmoji[g] ?? ""} {g}
                  {g === "寶可夢" && pokemonSets.length > 0 && (
                    <ChevronDown className={cn("w-3 h-3 transition-transform", game === "寶可夢" && "rotate-180")} />
                  )}
                </button>
              ))}
            </div>

            {/* 寶可夢系列 */}
            {game === "寶可夢" && pokemonSets.length > 0 && (
              <div className="border-t border-white/10 pt-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium">📦 版本系列</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setSelectedSet("全部")}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      selectedSet === "全部" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    )}>⚡ 全部系列</button>
                  {pokemonSets.map(set => (
                    <button key={set} onClick={() => setSelectedSet(set)}
                      className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        selectedSet === set ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                      )}>{set}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              找到 <span className="text-gray-300 font-medium">{cards.length}</span> 張卡牌
              {game === "寶可夢" && selectedSet !== "全部" && <span className="ml-2 text-yellow-400 text-xs">· {selectedSet}</span>}
            </span>
            <SlidersHorizontal className="w-3 h-3 text-gray-600" />
          </div>

          {cardsLoading ? (
            <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4" : "space-y-2"}>
              {Array(12).fill(0).map((_, i) => <div key={i} className={cn("glass rounded-xl shimmer", view === "grid" ? "aspect-[5/7]" : "h-16")} />)}
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <span className="text-4xl block mb-3">🃏</span>
              <p>找不到符合條件的卡牌</p>
              <button onClick={() => { setSearch(""); setGame("全部"); setSelectedSet("全部"); }} className="btn-secondary mt-3 text-sm">清除篩選</button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {cards.map(card => (
                <Link href={`/cards/${card.id}`} key={card.id} className="glass rounded-xl overflow-hidden card-hover group">
                  <div className="aspect-[5/7] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl relative overflow-hidden">
                    {card.image_url ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" /> : <span>{gameEmoji[card.game] ?? "🃏"}</span>}
                    <span className="absolute top-2 right-2 text-xs bg-black/50 px-1.5 py-0.5 rounded text-gray-300">{card.card_type === "sports" ? "運動" : "TCG"}</span>
                    {card.rarity && <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-yellow-300 font-bold">{card.rarity}</span>}
                  </div>
                  <div className="p-2.5 space-y-1">
                    <div className="text-xs font-semibold text-white line-clamp-2 leading-tight">{card.name}</div>
                    <div className="text-[10px] text-gray-500">{card.set_name ?? card.game}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map(card => (
                <Link href={`/cards/${card.id}`} key={card.id} className="glass rounded-xl p-4 flex items-center gap-4 card-hover group">
                  <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {card.image_url ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" /> : gameEmoji[card.game] ?? "🃏"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">{card.name}</div>
                    {card.name_en && <div className="text-xs text-gray-500 mt-0.5">{card.name_en}</div>}
                    <div className="text-xs text-gray-500 mt-1">{card.game}{card.set_name ? ` · ${card.set_name}` : ""}{card.rarity ? ` · ${card.rarity}` : ""}</div>
                  </div>
                  <span className="badge text-xs bg-gray-800 text-gray-400 shrink-0">{card.card_type === "sports" ? "運動卡" : "TCG"}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SHOWCASE TAB ═══ */}
      {tab === "showcase" && (
        <div className="space-y-8">
          {/* Top Collectors */}
          {!showcaseLoading && users.filter(u => u.reputation >= 50).length > 0 && (
            <div className="glass rounded-2xl p-6 border border-yellow-500/20"
              style={{ background: "linear-gradient(135deg, rgba(245,200,66,0.06) 0%, rgba(92,106,255,0.06) 100%)" }}>
              <h3 className="font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" /> 頂尖收藏家
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.filter(u => u.reputation >= 50).slice(0, 2).map(user => (
                  <Link href={`/users/${user.id}`} key={user.id}
                    className="bg-white/5 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                      {user.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">{user.display_name || user.username}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{user.collection_count} 張公開收藏 · {user.reputation.toLocaleString()} 聲望</div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {user.collections.slice(0, 3).map((c: any) => (
                          <span key={c.id} className="badge text-[10px] bg-gray-800 text-gray-400">{gameEmoji[c.cards?.game] ?? "🃏"} {c.cards?.name}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {[{ id: "all", label: "全部展示" }, { id: "tcg", label: "TCG 卡牌" }, { id: "sports", label: "運動卡" }].map(f => (
              <button key={f.id} onClick={() => setShowcaseFilter(f.id)}
                className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  showcaseFilter === f.id ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                )}>{f.label}</button>
            ))}
          </div>

          {showcaseLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-64 shimmer" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-gray-500 space-y-3">
              <Package className="w-12 h-12 mx-auto opacity-30" />
              <p>還沒有公開收藏，成為第一個展示的人吧！</p>
              <Link href="/collection" className="btn-primary text-sm inline-flex">開始收藏</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredUsers.map((user, idx) => (
                <Link href={`/users/${user.id}`} key={user.id} className="glass rounded-2xl overflow-hidden card-hover cursor-pointer group">
                  <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center gap-3 p-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 50% 50%, #5c6aff44 0%, transparent 70%)" }} />
                    {user.collections.length > 0 ? user.collections.map((c: any, ci: number) => (
                      <div key={c.id} className="w-16 h-24 rounded-lg bg-gray-700 flex items-center justify-center text-2xl border border-white/10 shadow-lg transition-transform group-hover:scale-105"
                        style={{ transform: `rotate(${(ci - 1) * 8}deg)`, zIndex: ci === 1 ? 10 : 5 }}>
                        {gameEmoji[c.cards?.game] ?? "🃏"}
                      </div>
                    )) : <div className="text-gray-600 text-sm">無公開收藏</div>}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-200">{user.display_name || user.username}</div>
                        <div className="text-xs text-gray-500">{user.reputation.toLocaleString()} 聲望</div>
                      </div>
                      {idx < 3 && user.reputation > 0 && <span className="ml-auto badge text-xs text-yellow-400 bg-yellow-900/20">⭐ 精選</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {user.collections.slice(0, 3).map((c: any) => (
                        <div key={c.id} className="flex-1 min-w-0 bg-white/5 rounded-lg p-2 text-center">
                          <div className="text-xs text-gray-400 truncate">{c.cards?.name}</div>
                          <div className="text-[10px] text-gray-600 mt-0.5">{c.condition}</div>
                        </div>
                      ))}
                      {user.collections.length === 0 && <div className="text-xs text-gray-600 italic">尚無公開收藏</div>}
                    </div>
                    <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {user.collection_count} 張</span>
                      <span className="ml-auto text-brand-400 group-hover:text-brand-300 font-medium">查看個人主頁 →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CardSearchPage() {
  return (
    <Suspense>
      <CardSearchContent />
    </Suspense>
  );
}
