import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Eye, Edit, Copy } from "lucide-react";
import { Metadata } from "next";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const admin = createAdminClient();
  const { data } = await admin.from("decks").select("name, game, description").eq("id", params.id).single();
  return {
    title: data ? `${data.name} — ${data.game} 卡組 | CardSearch` : "卡組",
    description: data?.description ?? `${data?.game} 卡組構築分享`,
  };
}

const conditionColor: Record<string, string> = { M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400" };

export default async function DeckDetailPage({ params }: Props) {
  const admin = createAdminClient();

  const { data: deck } = await admin
    .from("decks")
    .select("*, profiles(id, username, display_name, avatar_url)")
    .eq("id", params.id)
    .single();

  if (!deck) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-500 space-y-3">
      <p className="text-lg">找不到此卡組</p>
      <Link href="/decks" className="btn-secondary text-sm inline-flex">← 返回卡組列表</Link>
    </div>
  );

  const { data: cards } = await admin
    .from("deck_cards")
    .select("*, cards(id, name, game, rarity, set_name, image_url)")
    .eq("deck_id", params.id)
    .order("card_name");

  const totalCards = (cards ?? []).reduce((s: number, c: any) => s + c.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back */}
      <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 卡組列表
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-600/30">{deck.game}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1"><Eye className="w-3 h-3" /> {deck.view_count ?? 0} 次瀏覽</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{deck.name}</h1>
            {deck.description && <p className="text-gray-400 text-sm">{deck.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5"
              onClick={undefined}
              id="copy-link-btn"
            >
              <Copy className="w-4 h-4" /> 複製連結
            </button>
            <Link href={`/decks/builder?id=${deck.id}`}
              className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5">
              <Edit className="w-4 h-4" /> 編輯
            </Link>
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
            {deck.profiles?.avatar_url
              ? <img src={deck.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              : deck.profiles?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <Link href={`/users/${deck.profiles?.id}`} className="text-sm text-white hover:text-brand-400 transition-colors">
              {deck.profiles?.display_name ?? deck.profiles?.username}
            </Link>
            <p className="text-xs text-gray-500">{new Date(deck.created_at).toLocaleDateString("zh-TW")}</p>
          </div>
          <div className="ml-auto text-sm font-semibold text-white">{totalCards} 張</div>
        </div>
      </div>

      {/* Cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-4">卡組內容（{(cards ?? []).length} 種 / {totalCards} 張）</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {(cards ?? []).map((c: any) => (
            <Link key={c.id} href={c.card_id ? `/cards/${c.card_id}` : "#"}
              className="group relative">
              <div className="aspect-[5/7] rounded-xl overflow-hidden bg-gray-800">
                {c.cards?.image_url || c.image_url
                  ? <img src={c.cards?.image_url ?? c.image_url} alt={c.card_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">🃏</div>
                }
                {c.quantity > 1 && (
                  <div className="absolute top-1.5 right-1.5 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    ×{c.quantity}
                  </div>
                )}
              </div>
              <div className="mt-1 px-0.5">
                <p className="text-[10px] text-gray-300 truncate leading-tight">{c.card_name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Copy link client script */}
      <CopyLinkButton deckId={deck.id} />
    </div>
  );
}

// Client component for copy button
function CopyLinkButton({ deckId }: { deckId: string }) {
  return (
    <script dangerouslySetInnerHTML={{
      __html: `
        document.getElementById('copy-link-btn')?.addEventListener('click', function() {
          navigator.clipboard.writeText(location.origin + '/decks/${deckId}');
        });
      `
    }} />
  );
}
