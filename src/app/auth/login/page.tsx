"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Layers, Mail, Github } from "lucide-react";
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

  async function handleGithubLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
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
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium text-gray-200 transition-colors">
              <span className="text-lg">G</span> Google
            </button>
            <button onClick={handleGithubLogin}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium text-gray-200 transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </button>
          </div>

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
