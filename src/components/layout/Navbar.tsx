"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, Menu, X, Layers, LogOut, Shield, BookmarkPlus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/cards", label: "卡牌資料庫" },
  { href: "/community", label: "社群討論" },
  { href: "/showcase", label: "收藏展示" },
  { href: "/collection", label: "我的收藏" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<{ username: string; role: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const { notifications } = await res.json();
      setNotifications(notifications ?? []);
      setUnreadCount(notifications?.filter((n: any) => !n.is_read).length ?? 0);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults(null); setSearchOpen(false); return; }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (res.ok) { setSearchResults(await res.json()); setSearchOpen(true); }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("username, role").eq("id", user.id).single()
          .then(({ data }) => setProfile(data));
        fetchNotifications();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Card<span className="text-brand-400">Search</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href ? "bg-brand-600/20 text-brand-400" : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
              )}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <div ref={searchRef} className="relative hidden md:block">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm w-52 xl:w-64 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="搜尋卡牌、文章..."
                className="bg-transparent flex-1 outline-none text-sm placeholder-gray-500 text-gray-100" />
            </div>
            {searchOpen && searchResults && (
              <div className="absolute top-full left-0 mt-2 w-80 glass rounded-xl shadow-2xl z-50 overflow-hidden">
                {searchResults.cards?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs text-gray-500 px-2 py-1 font-medium">卡牌</div>
                    {searchResults.cards.map((c: any) => (
                      <Link key={c.id} href={`/cards/${c.id}`} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <span className="text-lg">🃏</span>
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200 truncate">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.game}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.posts?.length > 0 && (
                  <div className="p-2 border-t border-white/10">
                    <div className="text-xs text-gray-500 px-2 py-1 font-medium">文章</div>
                    {searchResults.posts.map((p: any) => (
                      <Link key={p.id} href={`/community/${p.id}`} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <span className="text-lg">📝</span>
                        <div className="text-sm text-gray-200 truncate">{p.title}</div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.cards?.length === 0 && searchResults.posts?.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">沒有找到相關結果</div>
                )}
              </div>
            )}
          </div>
          <div ref={notifRef} className="relative">
            <button onClick={() => { setNotifOpen(v => !v); if (!notifOpen && user) fetchNotifications(); }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-colors relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 glass rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <span className="text-sm font-semibold text-white">通知</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">全部已讀</button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {!user ? (
                    <div className="p-4 text-center text-sm text-gray-500">登入後查看通知</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">目前沒有通知</div>
                  ) : notifications.map((n: any) => (
                    <Link key={n.id} href={n.link ?? "#"}
                      onClick={() => { setNotifOpen(false); if (!n.is_read) fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }); }}
                      className={`flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!n.is_read ? "bg-brand-900/10" : ""}`}>
                      <span className="text-lg shrink-0">{{ comment: "💬", reply: "↩️", vote: "▲", system: "📢" }[n.type as string] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200">{n.title}</p>
                        {n.message && <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>}
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1.5" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="relative">
              <button onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-gray-200 text-sm font-medium px-3 py-2 rounded-lg transition-colors border border-white/10">
                <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                  {profile?.username?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden sm:inline max-w-[80px] truncate">{profile?.username ?? "用戶"}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl py-1 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">{profile?.username}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {profile?.role === "admin" && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors">
                      <Shield className="w-4 h-4" /> 後台管理
                    </Link>
                  )}
                  <Link href="/profile" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                    <User className="w-4 h-4" /> 個人資料
                  </Link>
                  <Link href="/collection" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                    <BookmarkPlus className="w-4 h-4" /> 我的收藏
                  </Link>
                  <Link href="/wishlist" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                    ⭐ 想求清單
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors">
                    <LogOut className="w-4 h-4" /> 登出
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login"
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">登入</span>
            </Link>
          )}

          <button className="md:hidden p-2 text-gray-400 hover:text-gray-100"
            onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-gray-950 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className={cn("px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href ? "bg-brand-600/20 text-brand-400" : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
              )}>
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link href="/auth/login" onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 bg-brand-600 text-white text-sm font-medium px-3 py-2.5 rounded-lg">
              <User className="w-4 h-4" /> 登入 / 註冊
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
