"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Layers, Mail } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setMessage(error.message);
      else setMessage("確認信已寄出，請查看你的信箱！");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("帳號或密碼錯誤");
      else location.href = "/";
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(circle at 50% 30%, rgba(92,106,255,0.15) 0%, transparent 60%)" }}>
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Card<span className="text-brand-400">Search</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">{isSignUp ? "建立帳號" : "歡迎回來"}</h1>
          <p className="text-gray-400 text-sm mt-1">{isSignUp ? "加入台灣最大卡牌收藏社群" : "登入你的 CardSearch 帳號"}</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          {/* OAuth */}
          <button onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium text-gray-200 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            使用 Google 帳號登入
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">或使用 Email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">電子郵件</label>
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="bg-transparent flex-1 outline-none text-sm text-gray-100 placeholder-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">密碼</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            </div>

            {message && (
              <div className={`text-sm p-3 rounded-lg ${message.includes("已寄出") ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors">
              {loading ? "處理中..." : isSignUp ? "建立帳號" : "登入"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {isSignUp ? "已有帳號？" : "還沒有帳號？"}
            <button onClick={() => { setIsSignUp(v => !v); setMessage(""); }}
              className="text-brand-400 hover:text-brand-300 ml-1 font-medium">
              {isSignUp ? "登入" : "免費註冊"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
