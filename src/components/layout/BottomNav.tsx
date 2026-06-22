"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/community",  label: "社群", icon: Home },
  { href: "/trade",      label: "換卡", icon: ArrowLeftRight },
  { href: "/messages",   label: "訊息", icon: MessageSquare },
  { href: "/my-page",    label: "我的", icon: User },
];

// Hide bottom nav on full-screen chat pages
const HIDDEN_PREFIXES = ["/messages/"];

export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setLoggedIn(true);
      fetch("/api/messages")
        .then(r => r.json())
        .then(d => setUnread(d.unread_total ?? 0));
    });
  }, []);

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/community" && pathname.startsWith(href));
          const isMessages = href === "/messages";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors",
                isActive ? "text-brand-400" : "text-gray-500 active:text-gray-300"
              )}
            >
              <div className="relative">
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 1.75} />
                {isMessages && loggedIn && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-green-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold px-0.5">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
