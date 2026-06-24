"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Zap, Crown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FREE_FEATURES = ["換卡清單（最多 10 筆）", "基本收藏管理", "社群討論", "站內通知"];
const PREMIUM_FEATURES = ["無限換卡清單", "進階搜尋篩選", "收藏價值估算", "優先配對通知", "Premium 徽章", "所有免費功能"];

export default function UpgradePage() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("is_premium, premium_until").eq("id", user.id).single();
      if (data?.is_premium && data?.premium_until && new Date(data.premium_until) > new Date()) {
        setIsPremium(true);
      }
    }
    check();
  }, []);

  async function subscribe(plan: "monthly" | "yearly") {
    setLoading(plan);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const { url, error } = await res.json();
    if (error) { alert(error); setLoading(null); return; }
    window.location.href = url;
  }

  async function openPortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setPortalLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-brand-900/40 text-brand-400 px-4 py-1.5 rounded-full text-sm font-medium border border-brand-700/30">
          <Crown className="w-4 h-4" /> Cardreasch Premium
        </div>
        <h1 className="text-4xl font-bold text-white">升級解鎖完整功能</h1>
        <p className="text-gray-400 text-lg">加入 Premium，無限換卡、進階搜尋、優先配對</p>
      </div>

      {isPremium ? (
        <div className="glass rounded-2xl p-8 text-center space-y-4 border border-brand-500/30">
          <Crown className="w-12 h-12 text-brand-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">你已是 Premium 會員 🎉</h2>
          <p className="text-gray-400">感謝你的支持！所有進階功能已開放。</p>
          <button onClick={openPortal} disabled={portalLoading}
            className="btn-secondary px-6 py-2.5 disabled:opacity-50">
            {portalLoading ? "載入中..." : "管理訂閱"}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">免費方案</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">NT$0</span>
                <span className="text-gray-500 text-sm">/永久</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/" className="block w-full text-center py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors">
              繼續免費使用
            </Link>
          </div>

          {/* Monthly */}
          <div className="glass rounded-2xl p-6 space-y-5 border border-brand-500/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">最受歡迎</span>
            </div>
            <div>
              <p className="text-sm text-brand-400 font-medium mb-1">月付方案</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">NT$199</span>
                <span className="text-gray-500 text-sm">/月</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {PREMIUM_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => subscribe("monthly")} disabled={loading !== null}
              className="w-full btn-primary py-2.5 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading === "monthly" ? "處理中..." : <><Zap className="w-4 h-4" /> 立即升級</>}
            </button>
          </div>

          {/* Yearly */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">年付方案</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">NT$1,499</span>
                <span className="text-gray-500 text-sm">/年</span>
              </div>
              <p className="text-xs text-green-400 mt-1">省下 NT$889（比月付省 37%）</p>
            </div>
            <ul className="space-y-2.5">
              {PREMIUM_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => subscribe("yearly")} disabled={loading !== null}
              className="w-full py-2.5 rounded-xl border border-green-500/40 text-green-400 hover:bg-green-900/20 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading === "yearly" ? "處理中..." : <><Crown className="w-4 h-4" /> 年付升級</>}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-600">
        付款由 Stripe 安全處理 · 可隨時取消訂閱 · 如有問題請<Link href="/contact" className="text-brand-400 hover:text-brand-300 ml-1">聯絡我們</Link>
      </p>
    </div>
  );
}
