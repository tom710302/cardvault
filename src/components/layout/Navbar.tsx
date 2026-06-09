"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, Menu, X, Layers, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
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
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("username, role").eq("id", user.id).single()
          .then(({ data }) => setProfile(data));
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
          <button className="hidden md:flex items-center gap-2 input text-sm w-48 xl:w-64">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-gray-500">搜尋卡牌...</span>
          </button>
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-colors relative">
            <Bell className="w-5 h-5" />
          </button>

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
                  <Link href="/collection" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                    <User className="w-4 h-4" /> 我的收藏
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
