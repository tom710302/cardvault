"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeftRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import Link from "next/link";

const GAMES = ["寶可夢", "MTG", "遊戲王", "NBA", "MLB"];
const CONDITIONS = ["M", "NM", "LP", "MP", "HP"];
const conditionLabel: Record<string, string> = { M: "完美", NM: "近新", LP: "輕磨", MP: "中磨", HP: "重磨" };
const conditionColor: Record<string, string> = { M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400" };

function AddCardForm({ type, onAdd }: { type: "have" | "want"; onAdd: () => void }) {
  const [form, setForm] = useState({ card_name: "", card_game: "寶可夢", condition: "NM", condition_min: "LP", note: "", image_url: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.card_name.trim()) return;
    setLoading(true);
    const endpoint = type === "have" ? "/api/trade/haves" : "/api/trade/wants";
    const body = type === "have"
      ? { card_name: form.card_name, card_game: form.card_game, condition: form.condition, note: form.note, image_url: form.image_url }
      : { card_name: form.card_name, card_game: form.card_game, condition_min: form.condition_min, note: form.note };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setForm({ card_name: "", card_game: "寶可夢", condition: "NM", condition_min: "LP", note: "", image_url: "" });
      onAdd();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="glass rounded-xl p-4 space-y-3">
      <div className="text-sm font-semibold text-white mb-1">{type === "have" ? "+ 新增可換卡牌" : "+ 新增想要的牌"}</div>

      {/* 圖片上傳（只有「我有的牌」才顯示） */}
      {type === "have" && (
        <ImageUpload
          folder="trade"
          label="上傳卡牌照片"
          hint="JPG、PNG，最大 5MB（選填）"
          currentUrl={form.image_url}
          className="aspect-[4/3]"
          onUpload={url => setForm(v => ({ ...v, image_url: url }))}
          onRemove={() => setForm(v => ({ ...v, image_url: "" }))}
        />
      )}

      <input value={form.card_name} onChange={e => setForm(v => ({ ...v, card_name: e.target.value }))}
        placeholder="卡牌名稱（例：皮卡丘 ex、Black Lotus）"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />

      <div className="grid grid-cols-2 gap-2">
        <select value={form.card_game} onChange={e => setForm(v => ({ ...v, card_game: e.target.value }))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500">
          {GAMES.map(g => <option key={g}>{g}</option>)}
        </select>
        <select
          value={type === "have" ? form.condition : form.condition_min}
          onChange={e => setForm(v => type === "have" ? { ...v, condition: e.target.value } : { ...v, condition_min: e.target.value })}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500">
          {CONDITIONS.map(c => <option key={c} value={c}>{c} — {conditionLabel[c]}</option>)}
        </select>
      </div>

      <input value={form.note} onChange={e => setForm(v => ({ ...v, note: e.target.value }))}
        placeholder="備註（選填）"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />

      <button type="submit" disabled={loading || !form.card_name.trim()}
        className="w-full btn-primary text-sm py-2 disabled:opacity-50 flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> {loading ? "新增中…" : "新增"}
      </button>
    </form>
  );
}

export default function MyListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [haves, setHaves] = useState<any[]>([]);
  const [wants, setWants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/auth/login");
      else setUser(user);
    });
  }, []);

  async function loadLists(uid: string) {
    const [hRes, wRes] = await Promise.all([
      fetch(`/api/trade/haves?user_id=${uid}`),
      fetch(`/api/trade/wants?user_id=${uid}`),
    ]);
    if (hRes.ok) { const { haves } = await hRes.json(); setHaves(haves); }
    if (wRes.ok) { const { wants } = await wRes.json(); setWants(wants); }
    setLoading(false);
  }

  useEffect(() => { if (user) loadLists(user.id); }, [user]);

  async function removeHave(id: string) {
    await fetch(`/api/trade/haves?id=${id}`, { method: "DELETE" });
    setHaves(v => v.filter(h => h.id !== id));
  }

  async function removeWant(id: string) {
    await fetch(`/api/trade/wants?id=${id}`, { method: "DELETE" });
    setWants(v => v.filter(w => w.id !== id));
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trade" className="text-gray-400 hover:text-gray-200"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">管理清單</h1>
          <p className="text-gray-400 text-sm mt-0.5">填寫後系統會自動幫你尋找配對</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 我有的牌 */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> 我有的牌（可換出）
            <span className="text-xs text-gray-500 font-normal">({haves.length} 張)</span>
          </h2>
          <AddCardForm type="have" onAdd={() => loadLists(user.id)} />
          {loading ? <div className="glass rounded-xl h-24 shimmer" /> : (
            <div className="space-y-2">
              {haves.map(h => (
                <div key={h.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  {h.image_url
                    ? <img src={h.image_url} alt={h.card_name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-2xl shrink-0">🃏</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{h.card_name}</div>
                    <div className="text-xs text-gray-500">{h.card_game} · <span className={conditionColor[h.condition]}>{h.condition}</span>{h.note && ` · ${h.note}`}</div>
                  </div>
                  <button onClick={() => removeHave(h.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {haves.length === 0 && <div className="text-center text-gray-600 text-sm py-4">還沒有新增任何卡牌</div>}
            </div>
          )}
        </div>

        {/* 我想要的牌 */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> 我想要的牌（換入）
            <span className="text-xs text-gray-500 font-normal">({wants.length} 張)</span>
          </h2>
          <AddCardForm type="want" onAdd={() => loadLists(user.id)} />
          {loading ? <div className="glass rounded-xl h-24 shimmer" /> : (
            <div className="space-y-2">
              {wants.map(w => (
                <div key={w.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{w.card_name}</div>
                    <div className="text-xs text-gray-500">{w.card_game} · 品相至少 <span className={conditionColor[w.condition_min]}>{w.condition_min}</span>{w.note && ` · ${w.note}`}</div>
                  </div>
                  <button onClick={() => removeWant(w.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {wants.length === 0 && <div className="text-center text-gray-600 text-sm py-4">還沒有新增任何想要的牌</div>}
            </div>
          )}
        </div>
      </div>

      {(haves.length > 0 || wants.length > 0) && (
        <div className="text-center pt-4">
          <Link href="/trade/matches" className="btn-primary inline-flex items-center gap-2">
            查看我的配對結果 <ArrowLeftRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
