"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, CheckCircle, XCircle, Star, Clock, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TrustBadge } from "@/components/trade/TrustBadge";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "待回覆", color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30" },
  accepted:  { label: "已接受", color: "text-green-400 bg-green-900/20 border-green-700/30" },
  rejected:  { label: "已拒絕", color: "text-red-400 bg-red-900/20 border-red-700/30" },
  completed: { label: "已完成", color: "text-brand-400 bg-brand-900/20 border-brand-700/30" },
  cancelled: { label: "已取消", color: "text-gray-400 bg-gray-800/30 border-gray-700/30" },
};

const conditionColor: Record<string, string> = { M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400" };

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star className={`w-8 h-8 transition-colors ${n <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
        </button>
      ))}
    </div>
  );
}

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function loadOffer() {
    const res = await fetch(`/api/trade/offers/${params.id}`);
    if (res.ok) {
      const { offer } = await res.json();
      setOffer(offer);
      setReviewed(offer.has_my_review);
    }
    setLoading(false);
  }

  useEffect(() => { if (user) loadOffer(); }, [user]);

  async function updateStatus(status: string) {
    setActing(true);
    await fetch(`/api/trade/offers/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await loadOffer();
    setActing(false);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setActing(true);
    const res = await fetch("/api/trade/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: params.id, rating, comment }),
    });
    if (res.ok) { setReviewed(true); setRating(0); setComment(""); }
    setActing(false);
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 shimmer" />)}</div>;
  if (!offer) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500">找不到此提案</div>;

  const isRecipient = offer.to_user_id === user?.id;
  const isSender = offer.from_user_id === user?.id;
  const otherUser = isRecipient ? offer.from_profile : offer.to_profile;
  const s = statusConfig[offer.status] ?? statusConfig.pending;

  const offerItems = offer.items.filter((it: any) => it.direction === "offer");
  const requestItems = offer.items.filter((it: any) => it.direction === "request");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/trade/offers" className="text-gray-400 hover:text-gray-200"><ArrowLeftRight className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">換卡提案詳情</h1>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${s.color}`}>{s.label}</span>
      </div>

      {/* Counterparty */}
      <div className="glass rounded-xl p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {otherUser?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="font-semibold text-white">{otherUser?.display_name ?? otherUser?.username}</div>
          <TrustBadge userId={isRecipient ? offer.from_user_id : offer.to_user_id} size="sm" />
        </div>
      </div>

      {/* Cards being traded */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {offerItems.length > 0 && (
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {isSender ? "我提供的牌" : "他提供的牌"}</div>
            {offerItems.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-xs bg-blue-900/10 border border-blue-800/30 rounded-lg px-3 py-2">
                <span className="text-gray-200">{it.have?.card_name ?? "—"}</span>
                <span className={`font-bold ${conditionColor[it.have?.condition] ?? ""}`}>{it.have?.condition}</span>
              </div>
            ))}
          </div>
        )}
        {requestItems.length > 0 && (
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-green-400 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {isSender ? "我想換的牌" : "他想換的牌"}</div>
            {requestItems.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-xs bg-green-900/10 border border-green-800/30 rounded-lg px-3 py-2">
                <span className="text-gray-200">{it.have?.card_name ?? "—"}</span>
                <span className={`font-bold ${conditionColor[it.have?.condition] ?? ""}`}>{it.have?.condition}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      {offer.message && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-gray-300 italic">
          「{offer.message}」
        </div>
      )}

      {/* Date */}
      <div className="text-xs text-gray-600 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> 提案時間：{new Date(offer.created_at).toLocaleString("zh-TW")}
      </div>

      {/* Actions */}
      {offer.status === "pending" && isRecipient && (
        <div className="flex gap-3">
          <button onClick={() => updateStatus("accepted")} disabled={acting}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
            <CheckCircle className="w-4 h-4" /> 接受提案
          </button>
          <button onClick={() => updateStatus("rejected")} disabled={acting}
            className="flex-1 bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <XCircle className="w-4 h-4" /> 拒絕
          </button>
        </div>
      )}

      {offer.status === "pending" && isSender && (
        <button onClick={() => updateStatus("cancelled")} disabled={acting}
          className="w-full bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:bg-gray-800/60 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          取消提案
        </button>
      )}

      {offer.status === "accepted" && (
        <button onClick={() => updateStatus("completed")} disabled={acting}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> 確認換卡完成
        </button>
      )}

      {/* Review form */}
      {offer.status === "completed" && !reviewed && (
        <div className="glass rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> 留下評價</h2>
          <form onSubmit={submitReview} className="space-y-3">
            <StarRating value={rating} onChange={setRating} />
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="填寫評價（選填）…"
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            <button type="submit" disabled={!rating || acting}
              className="btn-primary w-full text-sm disabled:opacity-50">
              送出評價
            </button>
          </form>
        </div>
      )}

      {offer.status === "completed" && reviewed && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> 你已完成評價
        </div>
      )}
    </div>
  );
}
