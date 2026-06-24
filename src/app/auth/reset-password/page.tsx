"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMessage("兩次密碼不一致"); return; }
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("✅ 密碼已更新！");
      setTimeout(() => router.push("/"), 1500);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(circle at 50% 30%, rgba(92,106,255,0.15) 0%, transparent 60%)" }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Card<span className="text-brand-400">reasch</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">設定新密碼</h1>
          <p className="text-gray-400 text-sm mt-1">請輸入你的新密碼</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">新密碼</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="至少 6 個字元" required minLength={6}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">確認新密碼</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="再輸入一次" required minLength={6}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>

            {message && (
              <div className={`text-sm p-3 rounded-lg ${message.startsWith("✅") ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors">
              {loading ? "更新中..." : "更新密碼"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
