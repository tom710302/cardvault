"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, ArrowLeft, Mail, Camera } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ username: "", display_name: "", bio: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState({ email_trade_offer: true, email_comment_reply: true, email_trade_match: true });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      const [{ data: profile }, prefsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetch("/api/notifications/preferences"),
      ]);
      if (profile) {
        setForm({ username: profile.username ?? "", display_name: profile.display_name ?? "", bio: profile.bio ?? "" });
        setAvatarUrl(profile.avatar_url ?? null);
      }
      if (prefsRes.ok) { const { prefs } = await prefsRes.json(); if (prefs) setPrefs(prefs); }
      setLoading(false);
    }
    load();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("圖片大小不能超過 2MB"); return; }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) { toast.error("上傳失敗：" + uploadError.message); setUploadingAvatar(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithCache = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: urlWithCache }).eq("id", user.id);
    setAvatarUrl(urlWithCache);
    toast.success("頭像已更新！");
    setUploadingAvatar(false);
  }

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

  async function savePrefs(key: keyof typeof prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingPrefs(true);
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSavingPrefs(false);
  }

  async function changePassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
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
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative w-20 h-20 rounded-2xl overflow-hidden group shrink-0 focus:outline-none"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="avatar" fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-brand-700 flex items-center justify-center text-white text-3xl font-bold">
              {form.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera className="w-5 h-5 text-white" />}
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <div>
          <p className="font-medium text-white">{form.display_name || form.username}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-500 mt-1">點擊頭像上傳圖片（最大 2MB）</p>
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

      {/* Notification Preferences */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-400" /> Email 通知設定
          </h3>
          {savingPrefs && <span className="text-xs text-gray-500">儲存中...</span>}
        </div>
        <p className="text-xs text-gray-500">關閉後將不再收到該類型的 Email，站內通知不受影響。</p>
        {[
          { key: "email_trade_offer" as const, label: "換卡邀請", desc: "有人向你發送換卡提案時" },
          { key: "email_comment_reply" as const, label: "留言回覆", desc: "有人回覆你的文章或留言時" },
          { key: "email_trade_match" as const, label: "配對成功", desc: "你的換卡需求與他人配對時" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm text-gray-300">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <button
              onClick={() => savePrefs(key, !prefs[key])}
              className={`relative w-11 h-6 rounded-full transition-colors ${prefs[key] ? "bg-brand-600" : "bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

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
