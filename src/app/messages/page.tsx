"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }
      fetch("/api/messages")
        .then(r => r.json())
        .then(({ conversations }) => { setConversations(conversations ?? []); setLoading(false); });
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-brand-400" /> 私訊
      </h1>

      {loading ? (
        <div className="space-y-2">
          {Array(4).fill(0).map((_, i) => <div key={i} className="glass rounded-2xl h-16 shimmer" />)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center text-gray-500 space-y-2">
          <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
          <p>還沒有任何私訊</p>
          <p className="text-sm text-gray-600">到用戶主頁點擊「傳送訊息」開始聊天</p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map(conv => (
            <Link key={conv.id} href={`/messages/${conv.id}`}
              className={`flex items-center gap-3 glass rounded-2xl px-4 py-3 hover:border-brand-500/20 border transition-all ${conv.unread_count > 0 ? "border-brand-500/20 bg-brand-900/5" : "border-white/5"}`}>
              <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                {conv.other?.avatar_url
                  ? <img src={conv.other.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (conv.other?.display_name ?? conv.other?.username)?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${conv.unread_count > 0 ? "text-white" : "text-gray-200"}`}>
                    {conv.other?.display_name ?? conv.other?.username}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {conv.last_message ? timeAgo(conv.last_message.created_at) : ""}
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? "text-gray-300 font-medium" : "text-gray-500"}`}>
                  {conv.last_message?.content ?? "開始聊天"}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <span className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                  {conv.unread_count > 9 ? "9+" : conv.unread_count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
