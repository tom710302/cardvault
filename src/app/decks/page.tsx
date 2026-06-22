"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Eye, Layers, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GAMES = ["全部", "寶可夢", "MTG", "遊戲王", "NBA", "MLB"];

export default function DecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<any[]>([]);
  const [myDecks, setMyDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState("全部");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchDecks();
  }, [game]);

  async function fetchDecks() {
    setLoading(true);
    const params = new URLSearchParams();
    if (game !== "全部") params.set("game", game);
    const [pubRes, mineRes] = await Promise.all([
      fetch(`/api/decks?${params}`),
      fetch(`/api/decks?mine=1`),
    ]);
    if (pubRes.ok) { const { decks } = await pubRes.json(); setDecks(decks ?? []); }
    if (mineRes.ok) { const { decks } = await mineRes.json(); setMyDecks(decks ?? []); }
    setLoading(false);
  }

  const list = tab === "mine" ? myDecks : decks;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 mb-2 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-brand-400" /> 卡組列表
          </h1>
          <p className="text-gray-400 text-sm mt-1">探索社群分享的卡組，或建立自己的構築</p>
        </div>
        <Link href="/decks/builder" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新增卡組
        </Link>
      </div>

      {/* Tabs + Game filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex border border-white/10 rounded-xl overflow-hidden">
          {(["all", "mine"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-brand-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
              {t === "all" ? "全部卡組" : "我的卡組"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {GAMES.map(g => (
            <button key={g} onClick={() => setGame(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                game === g ? "bg-brand-600 border-brand-600 text-white" : "border-white/10 text-gray-400 hover:text-gray-200"
              }`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Deck grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-40 shimmer" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center text-gray-500 space-y-4">
          <Layers className="w-12 h-12 mx-auto opacity-30" />
          <p>{tab === "mine" ? "你還沒有卡組，建立第一個吧！" : "還沒有人分享卡組"}</p>
          <Link href="/decks/builder" className="btn-primary text-sm inline-flex gap-2">
            <Plus className="w-4 h-4" /> 建立卡組
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {list.map((deck: any) => {
            const cardCount = deck.deck_cards?.[0]?.count ?? "?";
            return (
              <Link key={deck.id} href={`/decks/${deck.id}`}
                className="glass rounded-2xl p-5 space-y-3 hover:border-brand-500/30 border border-white/5 transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-600/30 shrink-0">{deck.game}</span>
                  <span className="text-xs text-gray-600 flex items-center gap-1"><Eye className="w-3 h-3" />{deck.view_count ?? 0}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-1">{deck.name}</h3>
                  {deck.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{deck.description}</p>}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {deck.profiles?.avatar_url
                        ? <Image src={deck.profiles.avatar_url} alt="" fill className="object-cover" />
                        : deck.profiles?.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-400">{deck.profiles?.display_name ?? deck.profiles?.username}</span>
                  </div>
                  <span className="text-xs text-gray-500">{typeof cardCount === "number" ? `${cardCount} 張` : ""}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
