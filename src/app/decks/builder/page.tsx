"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Minus, Trash2, Save, Share2, ArrowLeft, Eye, EyeOff, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

const GAMES = ["寶可夢", "MTG", "遊戲王", "NBA", "MLB"];
const GAME_LIMIT: Record<string, number> = { 寶可夢: 60, MTG: 60, 遊戲王: 60 };

interface DeckCard {
  card_id: string; card_name: string; card_game: string;
  image_url: string | null; quantity: number;
}

function DeckBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("id");
  const toast = useToast();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [deckName, setDeckName] = useState("新卡組");
  const [game, setGame] = useState("寶可夢");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(deckId);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mobileTab, setMobileTab] = useState<"search" | "deck">("search");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }
      setUser(user);
    });
    if (deckId) loadDeck(deckId);
  }, []);

  async function loadDeck(id: string) {
    const res = await fetch(`/api/decks/${id}`);
    if (!res.ok) return;
    const { deck, cards } = await res.json();
    setDeckName(deck.name);
    setGame(deck.game);
    setDescription(deck.description ?? "");
    setIsPublic(deck.is_public);
    setDeckCards(cards.map((c: any) => ({
      card_id: c.card_id, card_name: c.card_name, card_game: c.card_game,
      image_url: c.cards?.image_url ?? c.image_url, quantity: c.quantity,
    })));
  }

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/cards/external?q=${encodeURIComponent(searchQuery)}&game=${encodeURIComponent(game)}`);
      if (res.ok) { const { cards } = await res.json(); setSearchResults(cards ?? []); }
      setSearching(false);
    }, 300);
  }, [searchQuery, game]);

  function addCard(card: any) {
    setDeckCards(prev => {
      const existing = prev.find(c => c.card_id === card.id);
      if (existing) {
        if (existing.quantity >= 4) { toast.error("同一張牌最多加入 4 張"); return prev; }
        return prev.map(c => c.card_id === card.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { card_id: card.id, card_name: card.name, card_game: card.game, image_url: card.image_url, quantity: 1 }];
    });
  }

  function updateQty(card_id: string, delta: number) {
    setDeckCards(prev => {
      const updated = prev.map(c => c.card_id === card_id ? { ...c, quantity: c.quantity + delta } : c);
      return updated.filter(c => c.quantity > 0);
    });
  }

  async function save() {
    if (!deckName.trim()) { toast.error("請填寫卡組名稱"); return; }
    setSaving(true);
    try {
      let id = savedId;
      if (!id) {
        const res = await fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: deckName, game, description, is_public: isPublic }),
        });
        if (!res.ok) { toast.error("建立失敗"); setSaving(false); return; }
        const { deck } = await res.json();
        id = deck.id;
        setSavedId(id);
        router.replace(`/decks/builder?id=${id}`);
      } else {
        await fetch(`/api/decks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: deckName, game, description, is_public: isPublic }),
        });
      }

      // Full sync: one PUT call replaces all deck cards
      await fetch(`/api/decks/${id}/cards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: deckCards }),
      });

      toast.success("卡組已儲存！");
    } catch {
      toast.error("儲存失敗");
    }
    setSaving(false);
  }

  const totalCards = deckCards.reduce((s, c) => s + c.quantity, 0);
  const limit = GAME_LIMIT[game] ?? 60;
  const progress = Math.min(100, (totalCards / limit) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-wrap glass sticky top-0 z-30">
        <Link href="/decks" className="text-gray-400 hover:text-gray-200 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <input
          value={deckName}
          onChange={e => setDeckName(e.target.value)}
          className="bg-transparent text-white font-bold text-lg outline-none border-b border-transparent focus:border-brand-500 transition-colors flex-1 min-w-0"
          placeholder="卡組名稱..."
        />

        <select value={game} onChange={e => setGame(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-2 py-1.5 shrink-0">
          {GAMES.map(g => <option key={g}>{g}</option>)}
        </select>

        <button onClick={() => setIsPublic(v => !v)}
          className="text-gray-400 hover:text-gray-200 shrink-0" title={isPublic ? "公開" : "私人"}>
          {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {savedId && (
          <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/decks/${savedId}`); toast.success("連結已複製！"); }}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <Share2 className="w-3.5 h-3.5" /> 分享
          </button>
        )}
        <button onClick={save} disabled={saving}
          className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5 shrink-0 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "儲存中..." : "儲存"}
        </button>
      </div>

      {/* Mobile Tab */}
      <div className="flex md:hidden border-b border-white/10">
        {(["search", "deck"] as const).map(t => (
          <button key={t} onClick={() => setMobileTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mobileTab === t ? "text-white border-b-2 border-brand-500" : "text-gray-500"}`}>
            {t === "search" ? `搜尋卡牌` : `卡組 (${totalCards})`}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Search */}
        <div className={`w-full md:w-1/2 border-r border-white/10 flex flex-col ${mobileTab !== "search" ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={`搜尋${game}卡牌...`}
                className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {searching && <div className="text-center text-gray-500 text-sm py-8">搜尋中...</div>}
            {!searching && searchQuery && searchResults.length === 0 && (
              <div className="text-center text-gray-600 text-sm py-8 space-y-2">
                <p>找不到「{searchQuery}」</p>
                {game === "寶可夢" && /[一-鿿]/.test(searchQuery) && (
                  <p className="text-xs text-gray-700">試試英文名稱，例如：Pikachu、Charizard、Mewtwo</p>
                )}
              </div>
            )}
            {!searchQuery && (
              <div className="text-center text-gray-600 text-sm py-12 space-y-1">
                <p>輸入卡牌名稱開始搜尋</p>
                {!["寶可夢","MTG","遊戲王"].includes(game) && (
                  <p className="text-xs text-gray-700">{game} 目前無外部卡牌資料庫</p>
                )}
              </div>
            )}
            {searchResults.map(card => {
              const inDeck = deckCards.find(c => c.card_id === card.id);
              return (
                <div key={card.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-14 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                    {card.image_url
                      ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">🃏</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{card.name}</div>
                    <div className="text-xs text-gray-500">{card.set_name ?? card.game}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inDeck && <span className="text-xs text-brand-400 font-bold">×{inDeck.quantity}</span>}
                    <button onClick={() => addCard(card)}
                      className="w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Deck */}
        <div className={`w-full md:w-1/2 flex flex-col ${mobileTab !== "deck" ? "hidden md:flex" : "flex"}`}>
          {/* Progress bar */}
          <div className="px-4 py-3 border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{totalCards} / {limit} 張</span>
              <span className={totalCards > limit ? "text-red-400" : totalCards === limit ? "text-green-400" : "text-gray-500"}>
                {totalCards > limit ? `超出 ${totalCards - limit} 張` : totalCards === limit ? "✓ 達到上限" : `還差 ${limit - totalCards} 張`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${totalCards > limit ? "bg-red-500" : "bg-brand-500"}`}
                style={{ width: `${Math.min(100, progress)}%` }} />
            </div>

            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="卡組說明（選填）..."
              rows={2}
              className="w-full bg-gray-900/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-400 placeholder-gray-600 outline-none resize-none focus:border-brand-500/30 transition-colors" />
          </div>

          {/* Cards list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {deckCards.length === 0 ? (
              <div className="text-center text-gray-600 text-sm py-12 space-y-2">
                <div className="text-4xl">🃏</div>
                <p>從左側搜尋並加入卡牌</p>
              </div>
            ) : (
              deckCards.map(card => (
                <div key={card.card_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group">
                  <div className="w-8 h-11 rounded bg-gray-800 overflow-hidden shrink-0">
                    {card.image_url
                      ? <img src={card.image_url} alt={card.card_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm">🃏</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{card.card_name}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(card.card_id, -1)}
                      className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold text-white w-5 text-center">{card.quantity}</span>
                    <button onClick={() => updateQty(card.card_id, 1)}
                      disabled={card.quantity >= 4}
                      className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-30">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => updateQty(card.card_id, -card.quantity)}
                      className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeckBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">載入中...</div>}>
      <DeckBuilderInner />
    </Suspense>
  );
}
