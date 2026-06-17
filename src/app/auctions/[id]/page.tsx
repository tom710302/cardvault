"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Gavel, Users, TrendingUp, CheckCircle, Crown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

interface Auction {
  id: string; title: string; description: string | null; image_url: string | null;
  starting_price: number; current_price: number; min_increment: number;
  end_at: string; status: string; created_by: string; winner_id: string | null;
  contact_info: string | null;
  profiles: { id: string; username: string; display_name: string | null } | null;
}
interface Bid {
  id: string; amount: number; created_at: string;
  user_id: string;
  profiles: { username: string; display_name: string | null } | null;
}

function Countdown({ endAt, onExpire }: { endAt: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("已結束"); onExpire?.(); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d} 天 ${h} 時 ${m} 分`);
      else if (h > 0) setTimeLeft(`${h} 時 ${m} 分 ${s} 秒`);
      else setTimeLeft(`${m} 分 ${s} 秒`);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endAt]);
  const isUrgent = new Date(endAt).getTime() - Date.now() < 3600000 && timeLeft !== "已結束";
  return (
    <span className={cn("font-mono text-lg font-bold", isUrgent ? "text-red-400 animate-pulse" : "text-white")}>{timeLeft}</span>
  );
}

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);

  const fetchAuction = useCallback(async () => {
    const [aRes, bRes] = await Promise.all([
      fetch(`/api/auctions/${id}`),
      fetch(`/api/auctions/${id}/bid`),
    ]);
    if (aRes.ok) { const { auction } = await aRes.json(); setAuction(auction); }
    if (bRes.ok) { const { bids } = await bRes.json(); setBids(bids ?? []); }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAuction(); }, [fetchAuction]);

  // 設定建議出價
  useEffect(() => {
    if (auction) setBidAmount(String(auction.current_price + auction.min_increment));
  }, [auction]);

  async function placeBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { router.push("/auth/login"); return; }
    setSubmitting(true);
    const res = await fetch(`/api/auctions/${id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseInt(bidAmount) }),
    });
    if (res.ok) {
      await fetchAuction();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "出價失敗");
    }
    setSubmitting(false);
  }

  async function endAuction() {
    if (!confirm("確定要結標嗎？結標後無法再出價。")) return;
    setEnding(true);
    const res = await fetch(`/api/auctions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });
    if (res.ok) await fetchAuction();
    else toast.error("結標失敗");
    setEnding(false);
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="glass rounded-2xl h-64 shimmer" />
      <div className="glass rounded-2xl h-48 shimmer" />
    </div>
  );

  if (!auction) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500 space-y-3">
      <Gavel className="w-12 h-12 mx-auto opacity-30" />
      <p>找不到此競標</p>
      <Link href="/auctions" className="btn-secondary text-sm inline-flex">回到競標列表</Link>
    </div>
  );

  const isOwner = user?.id === auction.created_by;
  const isEnded = auction.status === "ended" || new Date(auction.end_at) < new Date();
  const isActive = auction.status === "active" && !isEnded;
  const topBid = bids[0];
  const isWinner = user && isEnded && topBid?.user_id === user.id;
  const minNextBid = auction.current_price + auction.min_increment;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/auctions" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> 回到競標列表
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Image + Info */}
        <div className="lg:col-span-3 space-y-4">
          {/* Image */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-8xl relative">
              {auction.image_url
                ? <img src={auction.image_url} alt={auction.title} className="w-full h-full object-contain" />
                : "🃏"
              }
              {isEnded && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold bg-red-600/80 px-6 py-2 rounded-xl">已結標</span>
                </div>
              )}
            </div>
          </div>

          {/* Title & Desc */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h1 className="text-2xl font-bold text-white">{auction.title}</h1>
            {auction.description && <p className="text-gray-400 text-sm leading-relaxed">{auction.description}</p>}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-sm text-gray-500">
              <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold">
                {auction.profiles?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span>發起人：{auction.profiles?.display_name ?? auction.profiles?.username}</span>
            </div>
          </div>
        </div>

        {/* Right: Bid Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price + Timer */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">目前最高出價</div>
              <div className="text-3xl font-bold text-brand-400">NT${auction.current_price.toLocaleString()}</div>
              {auction.current_price === auction.starting_price && (
                <div className="text-xs text-gray-600 mt-0.5">起標價</div>
              )}
            </div>

            {isActive && (
              <div className="border border-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Clock className="w-3.5 h-3.5" /> 剩餘時間
                </div>
                <Countdown endAt={auction.end_at} onExpire={fetchAuction} />
              </div>
            )}

            {/* Winner announcement */}
            {isEnded && topBid && (
              <div className={cn("rounded-xl p-4 space-y-1 border",
                isWinner ? "bg-yellow-900/20 border-yellow-500/30" : "bg-white/5 border-white/10"
              )}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Crown className={cn("w-4 h-4", isWinner ? "text-yellow-400" : "text-gray-400")} />
                  <span className={isWinner ? "text-yellow-300" : "text-gray-300"}>
                    {isWinner ? "🎉 恭喜你得標！" : `得標者：${topBid.profiles?.display_name ?? topBid.profiles?.username}`}
                  </span>
                </div>
                <div className="text-xs text-gray-500">得標金額：NT${topBid.amount.toLocaleString()}</div>
                {isWinner && auction.contact_info && (
                  <div className="mt-2 text-xs text-yellow-300 bg-yellow-900/20 rounded-lg p-2">
                    📬 聯絡方式：{auction.contact_info}
                  </div>
                )}
              </div>
            )}

            {/* Bid form */}
            {isActive && !isOwner && user && (
              <form onSubmit={placeBid} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">
                    出價金額（最低 NT${minNextBid.toLocaleString()}）
                  </label>
                  <div className="flex gap-2">
                    <input type="number" min={minNextBid} value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 5].map(mult => (
                      <button key={mult} type="button"
                        onClick={() => setBidAmount(String(auction.current_price + auction.min_increment * mult))}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors">
                        +{auction.min_increment * mult}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={submitting || parseInt(bidAmount) < minNextBid}
                  className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  <Gavel className="w-4 h-4" /> {submitting ? "出價中…" : `出價 NT$${parseInt(bidAmount || "0").toLocaleString()}`}
                </button>
              </form>
            )}

            {isActive && !user && (
              <Link href="/auth/login" className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                <Gavel className="w-4 h-4" /> 登入後出價
              </Link>
            )}

            {isActive && isOwner && (
              <div className="space-y-2">
                <div className="glass rounded-xl p-3 text-xs text-gray-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-gray-600 mt-0.5" />
                  <span>這是你發起的競標，不能對自己的商品出價。</span>
                </div>
                <button onClick={endAuction} disabled={ending}
                  className="w-full py-2.5 rounded-xl border border-red-700/50 text-red-400 hover:bg-red-900/20 text-sm transition-colors disabled:opacity-50">
                  {ending ? "結標中…" : "提前結標"}
                </button>
              </div>
            )}

            {isOwner && auction.contact_info && (
              <div className="text-xs text-gray-500 border border-white/10 rounded-xl p-3">
                <span className="text-gray-600">你設定的聯絡方式：</span> {auction.contact_info}
              </div>
            )}
            {isActive && !isOwner && (
              <div className="text-xs text-gray-600 text-center py-1">
                📬 聯絡方式將於結標後通知得標者
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-white">{bids.length}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> 出價次數
              </div>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-white">NT${auction.min_increment}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> 最低加價
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid History */}
      {bids.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" /> 出價紀錄
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bids.map((bid, i) => (
              <div key={bid.id} className={cn(
                "flex items-center justify-between py-2.5 px-3 rounded-xl text-sm",
                i === 0 ? "bg-brand-900/20 border border-brand-700/30" : "bg-white/3 hover:bg-white/5"
              )}>
                <div className="flex items-center gap-2">
                  {i === 0 && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                  <span className={i === 0 ? "text-white font-medium" : "text-gray-400"}>
                    {bid.profiles?.display_name ?? bid.profiles?.username ?? "匿名"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("font-bold", i === 0 ? "text-brand-400" : "text-gray-300")}>
                    NT${bid.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(bid.created_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
