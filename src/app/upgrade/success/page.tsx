"use client";

import { Crown } from "lucide-react";
import Link from "next/link";

export default function UpgradeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-full bg-brand-900/50 flex items-center justify-center mx-auto border border-brand-500/30">
          <Crown className="w-10 h-10 text-brand-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">升級成功！🎉</h1>
        <p className="text-gray-400">感謝你成為 Cardreasch Premium 會員，所有進階功能已開放。</p>
        <div className="flex gap-3 justify-center">
          <Link href="/trade" className="btn-primary px-6 py-2.5">前往換卡系統</Link>
          <Link href="/" className="btn-secondary px-6 py-2.5">回首頁</Link>
        </div>
      </div>
    </div>
  );
}
