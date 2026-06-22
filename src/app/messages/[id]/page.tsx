"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Send, ArrowLeft, ImagePlus, X, Play } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string; sender_id: string; content: string | null;
  media_url: string | null; media_type: string | null;
  is_read: boolean; created_at: string;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setUploadError("只支援圖片或影片"); return; }
    if (isImage && file.size > MAX_IMAGE_SIZE) { setUploadError("圖片最大 10MB"); return; }
    if (isVideo && file.size > MAX_VIDEO_SIZE) { setUploadError("影片最大 50MB"); return; }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function clearFile() {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setUploadError(null);
  }

  async function send() {
    const content = input.trim();
    if (!content && !selectedFile) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);

    let media_url: string | null = null;
    let media_type: string | null = null;

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop() ?? "bin";
      const path = `${id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("message-attachments")
        .upload(path, selectedFile, { contentType: selectedFile.type });

      if (error) {
        setUploadError("上傳失敗，請再試一次");
        sendingRef.current = false;
        setSending(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(data.path);
      media_url = publicUrl;
      media_type = selectedFile.type.startsWith("image/") ? "image" : "video";
      clearFile();
    }

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "38px";

    const res = await fetch(`/api/messages/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content || null, media_url, media_type }),
    });
    if (!res.ok) { if (content) setInput(content); }

    sendingRef.current = false;
    setSending(false);
    inputRef.current?.focus();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto" style={{ height: "calc(100dvh - 4rem)", paddingBottom: "env(safe-area-inset-bottom)" }}>
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
          const sameAuthor = prev && prev.sender_id === msg.sender_id && !showTime;

          return (
            <div key={msg.id}>
              {showTime && (
                <div className="text-center text-xs text-gray-600 py-3">{formatTime(msg.created_at)}</div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${sameAuthor ? "mt-0.5" : "mt-2"}`}>
                <div className={`max-w-[75%] ${msg.media_url && !msg.content ? "" : "px-3.5 py-2"} text-sm leading-relaxed break-words ${
                  isMine
                    ? `bg-brand-600 text-white ${msg.media_url && !msg.content ? "overflow-hidden" : ""} ${sameAuthor ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tr-sm"}`
                    : `bg-gray-800 text-gray-100 ${msg.media_url && !msg.content ? "overflow-hidden" : ""} ${sameAuthor ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tl-sm"}`
                }`}>
                  {/* Media */}
                  {msg.media_url && msg.media_type === "image" && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                      <img src={msg.media_url} alt="" className="max-w-full rounded-2xl block cursor-pointer hover:opacity-90 transition-opacity" style={{ maxHeight: 300 }} />
                    </a>
                  )}
                  {msg.media_url && msg.media_type === "video" && (
                    <video src={msg.media_url} controls className="max-w-full rounded-2xl block" style={{ maxHeight: 300 }} />
                  )}
                  {/* Text */}
                  {msg.content && (
                    <span className={msg.media_url ? "block px-3.5 py-2 pt-1" : ""}>{msg.content}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="glass border-t border-white/10 px-4 py-3 shrink-0 space-y-2">
        {/* File preview */}
        {filePreview && selectedFile && (
          <div className="relative inline-block">
            {selectedFile.type.startsWith("image/") ? (
              <img src={filePreview} alt="" className="max-h-28 rounded-xl object-cover" />
            ) : (
              <div className="relative">
                <video src={filePreview} className="max-h-28 rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
            <button onClick={clearFile}
              className="absolute -top-2 -right-2 w-5 h-5 bg-gray-700 hover:bg-gray-600 border border-white/10 rounded-full flex items-center justify-center transition-colors">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
        {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            title="傳送圖片或影片"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="輸入訊息... (Shift+Enter 換行)"
            rows={1}
            style={{ height: "38px" }}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-brand-500 resize-none transition-colors"
          />
          <button onClick={send} disabled={sending || (!input.trim() && !selectedFile)}
            className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white disabled:opacity-40 transition-colors shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
