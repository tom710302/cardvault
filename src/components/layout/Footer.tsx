import Link from "next/link";
import { Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-gray-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">
              Card<span className="text-brand-400">Search</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            TCG 與球員卡收藏家的最佳交流社群。<br />分享、討論、紀錄你的珍藏。
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">平台</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            {[["卡牌資料庫", "/cards"], ["社群討論", "/community"], ["收藏展示", "/showcase"], ["價格參考", "/cards"]].map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="hover:text-gray-300 transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">遊戲分類</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            {["MTG", "寶可夢", "遊戲王", "NBA 球員卡", "MLB 球員卡"].map((g) => (
              <li key={g}>
                <Link href="/cards" className="hover:text-gray-300 transition-colors">{g}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">關於</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            {[["關於我們", "/about"], ["使用條款", "/terms"], ["隱私政策", "/privacy"], ["聯絡我們", "/contact"]].map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="hover:text-gray-300 transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-4 max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
        <span>© 2026 CardSearch. All rights reserved.</span>
        <span>台灣最大卡牌交流社群</span>
      </div>
    </footer>
  );
}
