"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Clock, TrendingUp, Gavel, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Auction {
  id: string; title: string; description: string | null; image_url: string | null;
  starting_price: number; current_price: number; min_increment: number;
  end_at: string; status: string; created_by: string; winner_id: string | null;
  profiles: { username: string; display_name: string | null } | null;
}

const statusOptions = [
  { value: "active", label: "進行中", color: "text-green-400" },
  { value: "ended", label: "已結標", color: "text-gray-400" },
  { value: "all", label: "全部", color: "text-gray-400" },
];

function Countdown({ endAt }: { endAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("已結束"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}天 ${h}時`);
      else if (h > 0) setTimeLeft(`${h}時 ${m}分`);
      else setTimeLeft(`${m}分 ${s}秒`);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endAt]);
  const isUrgent = new Date(endAt).getTime() - Date.now() < 3600000;
  return <span className={cn("text-xs font-mono", isUrgent && timeLeft !== "已結束" ? "text-red-400 animate-pulse" : "text-gray-400")}>{timeLeft}</span>;
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    let url = `/api/auctions?status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    if (res.ok) { const { auctions } = await res.json(); setAuctions(auctions ?? []); }
    setLoading(false);
  }, [status, search]);

  useEffect(() => { const t = setTimeout(fetchAuctions, 300); return () => clearTimeout(t); }, [fetchAuctions]);

  const active = auctions.filter(a => a.status === "active");
  const ended = auctions.filter(a => a.status === "ended");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Gavel className="w-7 h-7 text-brand-400" /> 競標系統
          </h1>
          <p className="text-gray-400 text-sm mt-1">競標你喜愛的卡牌，或發起自己的拍賣</p>
        </div>
        {user ? (
          <Link href="/auctions/new" className="btn-primary flex items-center gap-2 shrink-0 text-sm">
            <Plus className="w-4 h-4" /> 發起競標
          </Link>
        ) : (
          <Link href="/auth/login" className="btn-secondary text-sm">登入後發起競標</Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{active.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">進行中競標</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{auctions.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">搜尋結果</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-brand-400">
            {active.length > 0 ? `NT$${Math.max(...active.map(a => a.current_price)).toLocaleString()}` : "--"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">最高出價</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋競標商品..."
            className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
        </div>
        <div className="flex gap-2">
          {statusOptions.map(opt => (
            <button key={opt.value} onClick={() => setStatus(opt.value)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                status === opt.value ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              )}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-64 shimmer" />)}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 text-gray-500 space-y-3">
          <Gavel className="w-12 h-12 mx-auto opacity-30" />
          <p>目前沒有{status === "active" ? "進行中的" : ""}競標</p>
          {user && <Link href="/auctions/new" className="btn-primary text-sm inline-flex gap-2"><Plus className="w-4 h-4" /> 發起第一個競標</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map(auction => {
            const isEnded = auction.status === "ended" || new Date(auction.end_at) < new Date();
            return (
              <Link href={`/auctions/${auction.id}`} key={auction.id}
                className="glass rounded-2xl overflow-hidden card-hover group block">
                {/* Image */}
                <div className="h-44 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {auction.image_url
                    ? <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl">🃏</div>
                  }
                  {/* Status badge */}
                  <div className={cn("absolute top-3 left-3 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm",
                    isEnded ? "bg-gray-900/80 text-gray-400" : "bg-green-900/80 text-green-400"
                  )}>
                    {isEnded ? <><XCircle className="w-3 h-3" /> 已結標</> : <><CheckCircle className="w-3 h-3" /> 競標中</>}
                  </div>
                  {/* Countdown */}
                  {!isEnded && (
                    <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <Countdown endAt={auction.end_at} />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">{auction.title}</h3>
                  {auction.description && <p className="text-xs text-gray-500 line-clamp-2">{auction.description}</p>}

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-gray-500">目前最高出價</div>
                      <div className="text-xl font-bold text-brand-400">NT${auction.current_price.toLocaleString()}</div>
                      {auction.current_price === auction.starting_price && (
                        <div className="text-[10px] text-gray-600">起標價 NT${auction.starting_price.toLocaleString()}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">最低加價</div>
                      <div className="text-sm text-gray-300">+NT${auction.min_increment}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-600">
                      by {auction.profiles?.display_name ?? auction.profiles?.username ?? "匿名"}
                    </span>
                    <span className="text-xs text-brand-400 font-medium group-hover:text-brand-300">
                      {isEnded ? "查看結果 →" : "出價競標 →"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
