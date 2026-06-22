"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { TrendingUp, MessageSquare, Users, Star, ArrowRight, Flame, Zap, Trophy, ChevronRight, ChevronLeft, ArrowLeftRight } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const postTypeConfig: Record<string, { label: string; color: string }> = {
  showcase: { label: "📸 展示", color: "text-purple-400 bg-purple-900/30" },
  price_check: { label: "💰 價格詢問", color: "text-yellow-400 bg-yellow-900/30" },
  discussion: { label: "🗣️ 討論", color: "text-blue-400 bg-blue-900/30" },
  news: { label: "📰 資訊", color: "text-green-400 bg-green-900/30" },
};

const gameEmoji: Record<string, string> = { MTG: "⚔️", 寶可夢: "⚡", 遊戲王: "🌀", NBA: "🏀", MLB: "⚾" };

const THEME_MAP = {
  platform: { bgClass: "from-brand-950 via-gray-900 to-purple-950", glow: "#5c6aff", accentClass: "text-gradient" },
  trade:    { bgClass: "from-emerald-950 via-gray-900 to-cyan-950",  glow: "#00d68f", accentClass: "bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent" },
  collector:{ bgClass: "from-amber-950 via-gray-900 to-orange-950",  glow: "#f59e0b", accentClass: "bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent" },
  ad:       { bgClass: "from-violet-950 via-gray-900 to-fuchsia-950",glow: "#a855f7", accentClass: "bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent" },
} as const;
type ThemeKey = keyof typeof THEME_MAP;

type BannerData = { badge: string; headline: string; accent: string; desc: string; cta1: { label: string; href: string }; cta2: { label: string; href: string }; bgClass: string; glow: string; accentClass: string; art_type: string; };

function dbRowToBanner(r: any): BannerData {
  const t = THEME_MAP[(r.theme as ThemeKey) ?? "platform"] ?? THEME_MAP.platform;
  return {
    badge: r.badge ?? "",
    headline: r.headline ?? "",
    accent: r.accent ?? "",
    desc: r.description ?? "",
    cta1: { label: r.cta1_label ?? "了解更多", href: r.cta1_href ?? "/" },
    cta2: { label: r.cta2_label ?? "", href: r.cta2_href ?? "/" },
    bgClass: t.bgClass,
    glow: t.glow,
    accentClass: t.accentClass,
    art_type: r.art_type ?? "platform",
  };
}

const DEFAULT_BANNERS: BannerData[] = [
  { badge: "🔍 台灣最大實體卡牌交流社群", headline: "你的珍藏值得", accent: "被世界看見", desc: "集合 TCG 玩家與運動卡收藏家，一起討論、展示、追蹤市場行情。", cta1: { label: "加入討論", href: "/community" }, cta2: { label: "探索店家", href: "/search?tab=stores" }, ...THEME_MAP.platform, art_type: "platform" },
  { badge: "🔄 換卡系統正式上線", headline: "找到你的", accent: "換卡夥伴", desc: "登記想換的牌，系統自動配對。完成換卡累積信譽，晉升卡牌大師。", cta1: { label: "立即換卡", href: "/trade" }, cta2: { label: "查看配對", href: "/trade/matches" }, ...THEME_MAP.trade, art_type: "trade" },
  { badge: "⭐ 精選收藏家展示", headline: "探索頂級", accent: "收藏家世界", desc: "認識台灣最厲害的 TCG 與運動卡收藏家，看看他們的珍藏。", cta1: { label: "探索社群", href: "/community" }, cta2: { label: "精選收藏", href: "/community?tab=showcase" }, ...THEME_MAP.collector, art_type: "collector" },
  { badge: "📢 廣告位招募中", headline: "在這裡展示", accent: "你的品牌", desc: "觸及數千名 TCG 與運動卡收藏家，立即聯繫我們取得黃金曝光位置。", cta1: { label: "聯繫合作", href: "/contact" }, cta2: { label: "查看店家", href: "/search?tab=stores" }, ...THEME_MAP.ad, art_type: "ad" },
];

// ── Banner decorative art ──────────────────────────────────────────────
function PlatformArt() {
  return (
    <div className="relative w-44 h-52 select-none">
      <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-3xl" />
      {/* Card back */}
      <div className="absolute left-2 top-6 w-24 h-32 -rotate-[15deg] rounded-xl shadow-2xl overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg,#3b1f8c,#1e1254)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.05) 4px,rgba(255,255,255,.05) 8px)" }} />
        <div className="absolute inset-2 rounded-lg border border-purple-400/20 flex items-center justify-center">
          <span className="text-2xl opacity-40">🌀</span>
        </div>
      </div>
      {/* Card centre */}
      <div className="absolute left-10 top-2 w-24 h-32 rotate-[5deg] rounded-xl shadow-2xl overflow-hidden border border-indigo-400/30"
        style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed 50%,#2e1065)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.08),transparent)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <span className="text-4xl drop-shadow-lg">🃏</span>
          <div className="text-[9px] text-indigo-200/60 font-bold tracking-widest uppercase">Cardreasch</div>
        </div>
        <div className="absolute inset-x-2 top-1.5 h-px bg-indigo-300/20" />
        <div className="absolute inset-x-2 bottom-1.5 h-px bg-indigo-300/20" />
      </div>
      {/* Card front */}
      <div className="absolute left-20 top-10 w-20 h-28 rotate-[18deg] rounded-xl shadow-xl overflow-hidden border border-violet-400/20"
        style={{ background: "linear-gradient(135deg,#7c3aed,#be185d)" }}>
        <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl">⭐</span></div>
      </div>
      <div className="absolute top-0 right-2 text-yellow-300 text-lg animate-pulse">✦</div>
      <div className="absolute top-14 right-0 text-blue-300 text-sm animate-pulse [animation-delay:700ms]">✦</div>
      <div className="absolute bottom-8 left-0 text-purple-300 text-xs animate-pulse [animation-delay:1400ms]">✦</div>
      <div className="absolute bottom-2 right-6 text-indigo-300 text-base animate-pulse [animation-delay:300ms]">✦</div>
    </div>
  );
}

function TradeArt() {
  return (
    <div className="relative w-48 h-44 select-none flex items-center justify-center">
      <div className="absolute inset-0 bg-emerald-600/15 rounded-full blur-3xl" />
      {/* Left card */}
      <div className="absolute left-0 top-4 w-[72px] h-[100px] -rotate-[10deg] rounded-xl shadow-2xl overflow-hidden border border-emerald-400/30"
        style={{ background: "linear-gradient(135deg,#065f46,#0e7490)" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-3xl">⚡</span>
          <div className="text-[8px] text-emerald-300/60 font-bold">PIKA</div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-emerald-900/60 to-transparent" />
      </div>
      {/* Swap badge */}
      <div className="relative z-10 w-11 h-11 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xl font-bold shadow-lg shadow-emerald-900/40"
        style={{ background: "radial-gradient(circle,rgba(16,185,129,.15),transparent)" }}>⇄</div>
      {/* Right card */}
      <div className="absolute right-0 top-4 w-[72px] h-[100px] rotate-[10deg] rounded-xl shadow-2xl overflow-hidden border border-cyan-400/30"
        style={{ background: "linear-gradient(135deg,#0e7490,#164e63)" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-3xl">⚔️</span>
          <div className="text-[8px] text-cyan-300/60 font-bold">MTG</div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-cyan-900/60 to-transparent" />
      </div>
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-emerald-400/80 text-xs">✦</div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-cyan-400/80 text-xs">✦</div>
    </div>
  );
}

function CollectorArt() {
  return (
    <div className="relative w-44 h-52 select-none">
      <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-3xl" />
      {/* Crown */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-5xl z-20 leading-none drop-shadow-[0_0_16px_rgba(251,191,36,.7)]">👑</div>
      {/* Card stack */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36">
        <div className="absolute bottom-0 left-0 w-[76px] h-[106px] -rotate-[12deg] -translate-x-1 rounded-xl border border-orange-400/20 shadow-xl"
          style={{ background: "linear-gradient(135deg,#92400e,#431407)" }} />
        <div className="absolute bottom-0 left-0 translate-x-3 w-[76px] h-[106px] -rotate-[3deg] rounded-xl border border-amber-400/30 shadow-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#b45309,#92400e)" }}>
          <span className="text-3xl">⭐</span>
        </div>
        <div className="absolute bottom-0 left-0 translate-x-7 w-[76px] h-[106px] rotate-[8deg] rounded-xl border border-yellow-400/40 shadow-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg,#d97706,#b45309)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
            <span className="text-3xl">🏆</span>
            <div className="text-[8px] text-yellow-200/70 font-bold tracking-wider">COLLECTOR</div>
          </div>
        </div>
      </div>
      <div className="absolute top-10 right-1 text-yellow-400 text-base animate-pulse">★</div>
      <div className="absolute top-16 left-1 text-amber-300 text-sm animate-pulse [animation-delay:500ms]">★</div>
      <div className="absolute top-24 right-0 text-orange-300 text-xs animate-pulse [animation-delay:1000ms]">★</div>
    </div>
  );
}

function AdArt() {
  return (
    <div className="relative w-44 h-44 select-none flex items-center justify-center">
      <div className="absolute inset-0 bg-violet-600/15 rounded-full blur-3xl" />
      <div className="relative w-36 h-36 rounded-2xl border border-violet-400/40 shadow-2xl overflow-hidden flex flex-col items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#4c1d95,#6b21a8 50%,#701a75)" }}>
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        <span className="text-4xl relative z-10">📢</span>
        <div className="relative z-10 text-center">
          <div className="text-xs font-bold text-white/90 tracking-wider uppercase">廣告招募</div>
          <div className="text-[9px] text-violet-200/60 mt-0.5">限量廣告位</div>
        </div>
        <div className="relative z-10 border border-fuchsia-400/50 rounded-full px-3 py-0.5 text-[9px] text-fuchsia-200 font-semibold tracking-widest">
          YOUR AD HERE
        </div>
        <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-violet-400/60" />
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400/60" />
        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-violet-400/60" />
        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400/60" />
      </div>
      <div className="absolute top-0 right-2 text-violet-300 text-xl animate-pulse">✦</div>
      <div className="absolute bottom-2 left-0 text-fuchsia-300 text-base animate-pulse [animation-delay:600ms]">✦</div>
      <div className="absolute top-8 left-0 text-purple-300 text-xs animate-pulse [animation-delay:1200ms]">✦</div>
    </div>
  );
}
// ── End Banner Art ─────────────────────────────────────────────────────

export default function HomePage() {
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: "...", cards: "...", posts: "..." });
  const [homeBanners, setHomeBanners] = useState<BannerData[]>(DEFAULT_BANNERS);
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerFade, setBannerFade] = useState(true);
  const [bannerPaused, setBannerPaused] = useState(false);
  const supabase = createClient();

  function changeBanner(idx: number) {
    setBannerFade(false);
    setTimeout(() => { setActiveBanner(idx); setBannerFade(true); }, 280);
  }

  useEffect(() => {
    if (bannerPaused || homeBanners.length === 0) return;
    const t = setInterval(() => changeBanner((activeBanner + 1) % homeBanners.length), 5000);
    return () => clearInterval(t);
  }, [bannerPaused, activeBanner, homeBanners.length]);

  useEffect(() => {
    async function loadData() {
      const [auctionsRes, storesRes, postsData, usersData, statsData] = await Promise.all([
        fetch("/api/trade/recent"),
        fetch("/api/stores?sort=hot"),
        supabase.from("posts").select("*, profiles(username, avatar_url, reputation)").eq("is_deleted", false).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(60),
        supabase.from("profiles").select("id, username, reputation, created_at").order("reputation", { ascending: false }).limit(5),
        Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("cards").select("id", { count: "exact", head: true }),
          supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        ]),
      ]);

      if (auctionsRes.ok) {
        const { haves } = await auctionsRes.json();
        setRecentTrades((haves ?? []).slice(0, 4));
      }

      // Load banners from DB (falls back to DEFAULT_BANNERS if empty)
      fetch("/api/banners").then(r => r.ok ? r.json() : null).then(data => {
        if (data?.banners?.length) {
          setHomeBanners(data.banners.map(dbRowToBanner));
          setActiveBanner(0);
        }
      });
      if (storesRes.ok) { const { stores } = await storesRes.json(); setStores((stores ?? []).slice(0, 4)); }
      if (postsData.data) {
        const hotPosts = postsData.data
          .map(p => {
            const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
            const raw = (p.upvotes ?? 0) * 3 + (p.view_count ?? 0) * 0.1 + (p.comment_count ?? 0) * 1;
            return { ...p, _hot: raw / Math.pow(ageHours + 2, 1.5) };
          })
          .sort((a, b) => b._hot - a._hot)
          .slice(0, 4);
        setPosts(hotPosts);
      }
      if (usersData.data) setUsers(usersData.data);
      setStats({
        users: (statsData[0].count ?? 0).toLocaleString(),
        cards: (statsData[1].count ?? 0).toLocaleString(),
        posts: (statsData[2].count ?? 0).toLocaleString(),
      });
    }
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">

      {/* Hero Carousel */}
      <section
        className={`relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br ${homeBanners[activeBanner]?.bgClass ?? "from-brand-950 via-gray-900 to-purple-950"} transition-all duration-700`}
        onMouseEnter={() => setBannerPaused(true)}
        onMouseLeave={() => setBannerPaused(false)}
      >
        {/* Glow overlay */}
        <div className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `radial-gradient(circle at 70% 50%, ${homeBanners[activeBanner]?.glow ?? "#5c6aff"}44 0%, transparent 60%)` }} />

        <div className="relative p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
          {/* Slide content */}
          <div className={`flex-1 min-w-0 space-y-5 transition-opacity duration-[280ms] ${bannerFade ? "opacity-100" : "opacity-0"}`}>
            {homeBanners[activeBanner]?.badge && (
              <div className="badge text-brand-300 bg-black/30 border border-white/10 text-sm backdrop-blur-sm inline-flex">
                {homeBanners[activeBanner].badge}
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white">
              {homeBanners[activeBanner]?.headline}<br />
              <span className={homeBanners[activeBanner]?.accentClass ?? "text-gradient"}>{homeBanners[activeBanner]?.accent}</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg leading-relaxed">{homeBanners[activeBanner]?.desc}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={homeBanners[activeBanner]?.cta1.href ?? "/"} className="btn-primary flex items-center gap-2">
                {homeBanners[activeBanner]?.cta1.label} <ArrowRight className="w-4 h-4" />
              </Link>
              {homeBanners[activeBanner]?.cta2.label && (
                <Link href={homeBanners[activeBanner].cta2.href} className="btn-secondary flex items-center gap-2">
                  {homeBanners[activeBanner].cta2.label}
                </Link>
              )}
            </div>
            {/* Navigation: prev / dots / next */}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => changeBanner((activeBanner - 1 + homeBanners.length) % homeBanners.length)}
                className="w-7 h-7 glass rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {homeBanners.map((_, i) => (
                <button key={i} onClick={() => changeBanner(i)}
                  className={`rounded-full transition-all duration-300 ${i === activeBanner ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30 hover:bg-white/60"}`}
                />
              ))}
              <button onClick={() => changeBanner((activeBanner + 1) % homeBanners.length)}
                className="w-7 h-7 glass rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Decorative art – large screens only, driven by art_type field */}
          <div className={`hidden lg:flex items-center justify-center shrink-0 transition-opacity duration-[280ms] ${bannerFade ? "opacity-100" : "opacity-0"}`}>
            {homeBanners[activeBanner]?.art_type === "platform"  && <PlatformArt />}
            {homeBanners[activeBanner]?.art_type === "trade"     && <TradeArt />}
            {homeBanners[activeBanner]?.art_type === "collector" && <CollectorArt />}
            {homeBanners[activeBanner]?.art_type === "ad"        && <AdArt />}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-1 gap-3 shrink-0">
            {[
              { value: stats.users + "+", label: "收藏家" },
              { value: stats.cards + "+", label: "卡牌資料" },
              { value: stats.posts + "+", label: "社群文章" },
            ].map(({ value, label }) => (
              <div key={label} className="glass rounded-xl p-4 text-center">
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 換卡系統 */}
      {recentTrades.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-brand-400" /> 換卡系統</h2>
            <Link href="/trade" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">查看全部 <ChevronRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentTrades.map((have: any) => (
              <Link href={`/users/${have.user_id}`} key={have.id} className="glass rounded-xl overflow-hidden card-hover group block">
                <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-4xl overflow-hidden">
                  {have.image_url
                    ? <Image src={have.image_url} alt={have.card_name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    : "🃏"}
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-xs font-semibold text-white line-clamp-2 group-hover:text-brand-300 transition-colors leading-snug">{have.card_name}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{have.card_game}</span>
                    <span className="text-[10px] font-bold text-green-400">{have.condition}</span>
                  </div>
                  <div className="text-[10px] text-brand-400">🔄 可換</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 熱門店家 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> 熱門店家</h2>
          <Link href="/search?tab=stores" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">查看全部 <ChevronRight className="w-4 h-4" /></Link>
        </div>
        {stores.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-52 shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {stores.map((store) => (
              <Link href={`/stores/${store.id}`} key={store.id} className="glass rounded-xl overflow-hidden card-hover group block">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {store.image_url
                    ? <Image src={store.image_url} alt={store.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
                  }
                  {store.is_verified && (
                    <div className="absolute top-2 left-2 bg-brand-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                      ✓ 官方驗證
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <div className="text-sm font-semibold text-white line-clamp-1 group-hover:text-brand-300 transition-colors">{store.name}</div>
                  <div className="text-xs text-gray-500">{store.city}</div>
                  {store.games?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {store.games.slice(0, 3).map((g: string) => (
                        <span key={g} className="text-sm">{gameEmoji[g] ?? "🃏"}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 熱門討論 + 側邊欄 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> 熱門討論</h2>
            <Link href="/community" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">更多 <ChevronRight className="w-4 h-4" /></Link>
          </div>
          {posts.length === 0 ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}
            </div>
          ) : posts.map((post) => {
            const tc = postTypeConfig[post.post_type] ?? { label: post.post_type, color: "text-gray-400 bg-gray-800" };
            return (
              <Link href={`/community/${post.id}`} key={post.id} className="glass rounded-xl p-4 flex gap-4 card-hover group block">
                <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                  <span className="text-gray-600">▲</span>
                  <span className="text-sm font-bold text-gray-300">{post.upvotes}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${tc.color}`}>{tc.label}</span>
                    <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
                  </div>
                  <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors leading-snug line-clamp-2">{post.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold">
                        {post.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                      </span>
                      {post.profiles?.username}
                    </span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /></span>
                    <span>{post.view_count} 瀏覽</span>
                    <span>{timeAgo(new Date(post.created_at))}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 側邊欄 */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-gold-400" />
              <h3 className="font-semibold text-white text-sm">聲望排行榜</h3>
            </div>
            <div className="space-y-3">
              {users.length === 0 ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-8 glass rounded shimmer" />
              )) : users.map((user, i) => (
                <Link href={`/users/${user.id}`} key={user.id} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1 transition-colors">
                  <span className="text-xs text-gray-600 w-4 text-center font-mono">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{user.username}</div>
                    <div className="text-xs text-gray-500">{user.reputation?.toLocaleString()} 聲望</div>
                  </div>
                  {i === 0 && <span className="text-base">👑</span>}
                </Link>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">快速導覽</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ icon: "⚔️", label: "MTG", href: "/cards?game=MTG" }, { icon: "⚡", label: "寶可夢", href: "/cards?game=寶可夢" }, { icon: "🌀", label: "遊戲王", href: "/cards?game=遊戲王" }, { icon: "🏀", label: "NBA", href: "/cards?game=NBA" }, { icon: "⚾", label: "MLB", href: "/cards?game=MLB" }, { icon: "📈", label: "社群", href: "/community" }].map(({ icon, label, href }) => (
                <Link key={label} href={href} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-sm">
                  <span>{icon}</span> {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
