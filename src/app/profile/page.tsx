"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ username: "", display_name: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile) setForm({ username: profile.username ?? "", display_name: profile.display_name ?? "", bio: profile.bio ?? "" });
      setLoading(false);
    }
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("profiles").update({
      username: form.username,
      display_name: form.display_name,
      bio: form.bio,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    if (error) setMessage(error.message.includes("unique") ? "此用戶名已被使用" : error.message);
    else setMessage("✅ 儲存成功！");
    setSaving(false);
  }

  async function changePassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (!error) toast.success("密碼重設信已寄出，請查看信箱！");
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-16 shimmer" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="w-4 h-4" /> 返回首頁
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">個人資料設定</h1>
        <p className="text-gray-400 text-sm mt-1">更新你的公開資料</p>
      </div>

      {/* Avatar */}
      <div className="glass rounded-2xl p-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-brand-700 flex items-center justify-center text-white text-3xl font-bold">
          {form.username?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-medium text-white">{form.display_name || form.username}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-600 mt-1">目前頭像為字母縮寫，未來將支援上傳圖片</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={saveProfile} className="glass rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">用戶名 *</label>
          <input value={form.username} onChange={e => setForm(v => ({ ...v, username: e.target.value }))}
            placeholder="你的唯一用戶名" required maxLength={30}
            pattern="[a-zA-Z0-9_一-鿿]+"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
          <p className="text-xs text-gray-500 mt-1">只能使用英文、數字、底線或中文</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">顯示名稱</label>
          <input value={form.display_name} onChange={e => setForm(v => ({ ...v, display_name: e.target.value }))}
            placeholder="你想顯示的名字" maxLength={50}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">自我介紹</label>
          <textarea value={form.bio} onChange={e => setForm(v => ({ ...v, bio: e.target.value }))}
            placeholder="介紹一下你自己，喜歡收藏什麼卡牌..." maxLength={200} rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          <p className="text-xs text-gray-500 mt-1">{form.bio.length} / 200</p>
        </div>

        {message && (
          <div className={`text-sm p-3 rounded-lg ${message.startsWith("✅") ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "儲存中..." : "儲存變更"}
        </button>
      </form>

      {/* Security */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white">帳號安全</h3>
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <div>
            <p className="text-sm text-gray-300">電子郵件</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-gray-300">密碼</p>
            <p className="text-xs text-gray-500">上次更新時間未知</p>
          </div>
          <button onClick={changePassword} className="btn-secondary text-xs px-3 py-1.5">重設密碼</button>
        </div>
      </div>
    </div>
  );
}
