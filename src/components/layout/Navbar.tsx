"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, User, Menu, X, Layers } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/cards", label: "卡牌資料庫" },
  { href: "/community", label: "社群討論" },
  { href: "/showcase", label: "收藏展示" },
  { href: "/collection", label: "我的收藏" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
              )}
            >
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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
          </button>
          <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">登入</span>
          </button>
          <button
            className="md:hidden p-2 text-gray-400 hover:text-gray-100"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-gray-950 px-4 py-3 flex flex-col gap-1">
          <div className="flex items-center gap-2 input text-sm mb-3">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-gray-500">搜尋卡牌...</span>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
