"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string; sender_id: string; content: string; is_read: boolean; created_at: string;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }
      setMyId(user.id);
      loadChat();
    });

    const channel = supabase
      .channel(`conv:${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadChat() {
    const res = await fetch(`/api/messages/${id}`);
    if (!res.ok) { router.replace("/messages"); return; }
    const { messages: msgs, other } = await res.json();
    setMessages(msgs ?? []);
    setOtherUser(other);
    setLoading(false);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function send() {
    const content = input.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setInput("");
    const res = await fetch(`/api/messages/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) setInput(content);
    sendingRef.current = false;
    setSending(false);
    inputRef.current?.focus();
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/messages" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {loading ? (
          <div className="w-32 h-4 bg-gray-800 rounded shimmer" />
        ) : otherUser && (
          <>
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
              {otherUser.avatar_url
                ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                : (otherUser.display_name ?? otherUser.username)?.[0]?.toUpperCase()}
            </div>
            <Link href={`/users/${otherUser.id}`}
              className="font-semibold text-white hover:text-brand-300 transition-colors">
              {otherUser.display_name ?? otherUser.username}
            </Link>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">載入中...</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">傳送第一則訊息開始聊天</div>
        ) : messages.map((msg, i) => {
          const isMine = msg.sender_id === myId;
          const prev = messages[i - 1];
          const showTime = !prev || (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60 * 1000;
          const sameAuthorAsPrev = prev && prev.sender_id === msg.sender_id && !showTime;

          return (
            <div key={msg.id}>
              {showTime && (
                <div className="text-center text-xs text-gray-600 py-3">{formatTime(msg.created_at)}</div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${sameAuthorAsPrev ? "mt-0.5" : "mt-2"}`}>
                <div className={`max-w-[75%] px-3.5 py-2 text-sm leading-relaxed break-words ${
                  isMine
                    ? `bg-brand-600 text-white ${sameAuthorAsPrev ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tr-sm"}`
                    : `bg-gray-800 text-gray-100 ${sameAuthorAsPrev ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tl-sm"}`
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-white/10 px-4 py-3 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="輸入訊息... (Shift+Enter 換行)"
          rows={1}
          style={{ height: "38px" }}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand-500 resize-none transition-colors"
        />
        <button onClick={send} disabled={sending || !input.trim()}
          className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white disabled:opacity-40 transition-colors shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
