"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-900/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white mb-1">頁面發生錯誤</h1>
          <p className="text-gray-400 text-sm">
            這個頁面暫時無法載入，請重試或回到首頁。
          </p>
          {error.digest && (
            <p className="text-gray-700 text-xs mt-2 font-mono">#{error.digest}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> 重試
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-white/10 transition-colors"
          >
            <Home className="w-4 h-4" /> 回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
