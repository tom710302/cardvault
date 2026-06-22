"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users, RefreshCw, FileText, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BOARD_LABEL: Record<string, string> = {
  general: "綜合", mtg: "MTG", pokemon: "寶可夢", yugioh: "遊戲王",
  onepiece: "航海王", sports: "球員卡", other: "其他",
};
const CONDITION_COLOR: Record<string, string> = {
  M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400",
  MP: "text-orange-400", HP: "text-red-400", DMG: "text-gray-500",
};

function Avatar({ user, size = 8 }: { user: any; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 relative`;
  return (
    <div className={cls}>
      {user?.avatar_url
        ? <Image src={user.avatar_url} alt="" fill className="object-cover" />
        : <span>{user?.username?.[0]?.toUpperCase() ?? "?"}</span>}
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span className="text-xs text-gray-600">剛剛</span>;
  if (mins < 60) return <span className="text-xs text-gray-600">{mins} 分鐘前</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span className="text-xs text-gray-600">{hrs} 小時前</span>;
  const days = Math.floor(hrs / 24);
  if (days < 7) return <span className="text-xs text-gray-600">{days} 天前</span>;
  return <span className="text-xs text-gray-600">{new Date(date).toLocaleDateString("zh-TW")}</span>;
}

function FeedItem({ item }: { item: any }) {
  const userName = item.user?.display_name || item.user?.username || "用戶";

  if (item.kind === "post") {
    return (
      <Link href={item.link} className="flex gap-3 p-4 hover:bg-white/5 transition-colors rounded-xl group">
        <Avatar user={item.user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-200">{userName}</span>
            <span className="text-xs text-gray-500">發表了文章</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-900/40 text-brand-400 border border-brand-700/30">
              {BOARD_LABEL[item.board] ?? item.board}
            </span>
          </div>
          <p className="text-sm text-white font-medium truncate group-hover:text-brand-400 transition-colors">
            {item.title}
          </p>
          <div className="mt-1.5">
            <TimeAgo date={item.created_at} />
          </div>
        </div>
        <FileText className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
      </Link>
    );
  }

  if (item.kind === "trade_have") {
    return (
      <Link href={item.link} className="flex gap-3 p-4 hover:bg-white/5 transition-colors rounded-xl group">
        <Avatar user={item.user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-200">{userName}</span>
            <span className="text-xs text-gray-500">上架換卡</span>
          </div>
          <div className="flex items-center gap-2.5">
            {item.image_url && (
              <div className="relative w-8 h-11 rounded overflow-hidden bg-gray-800 shrink-0">
                <Image src={item.image_url} alt={item.card_name} fill className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{item.card_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-gray-500">{item.card_game}</span>
                {item.condition && (
                  <span className={cn("text-xs font-medium", CONDITION_COLOR[item.condition] ?? "text-gray-400")}>
                    {item.condition}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-1.5">
            <TimeAgo date={item.created_at} />
          </div>
        </div>
        <RefreshCw className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
      </Link>
    );
  }

  if (item.kind === "collection") {
    return (
      <Link href={item.link} className="flex gap-3 p-4 hover:bg-white/5 transition-colors rounded-xl group">
        <Avatar user={item.user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-200">{userName}</span>
            <span className="text-xs text-gray-500">收藏了一張卡</span>
          </div>
          <div className="flex items-center gap-2.5">
            {item.image_url && (
              <div className="relative w-8 h-11 rounded overflow-hidden bg-gray-800 shrink-0">
                <Image src={item.image_url} alt={item.card_name ?? ""} fill className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{item.card_name ?? "未知卡牌"}</p>
              {item.card_game && <p className="text-xs text-gray-500 mt-0.5">{item.card_game}</p>}
            </div>
          </div>
          <div className="mt-1.5">
            <TimeAgo date={item.created_at} />
          </div>
        </div>
        <Layers className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
      </Link>
    );
  }

  return null;
}

export default function FeedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) { setLoading(false); return; }
      fetch("/api/feed")
        .then(r => r.json())
        .then(({ items }) => setItems(items ?? []))
        .finally(() => setLoading(false));
    });
  }, []);

  if (!user && !loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <Users className="w-12 h-12 mx-auto text-gray-600" />
        <p className="text-gray-400">請先登入才能查看追蹤動態</p>
        <Link href="/auth/login" className="btn-primary inline-flex">登入</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-400" /> 追蹤動態
        </h1>
        <button onClick={() => {
          setLoading(true);
          fetch("/api/feed").then(r => r.json()).then(({ items }) => setItems(items ?? [])).finally(() => setLoading(false));
        }} className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-800 rounded shimmer w-1/3" />
                <div className="h-4 bg-gray-800 rounded shimmer w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-gray-600" />
          <div>
            <p className="text-gray-300 font-medium">目前沒有動態</p>
            <p className="text-sm text-gray-500 mt-1">追蹤其他收藏家，就能在這裡看到他們的最新動態</p>
          </div>
          <Link href="/community" className="btn-secondary text-sm inline-flex items-center gap-1.5">
            探索社群 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {items.map((item) => (
            <FeedItem key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
