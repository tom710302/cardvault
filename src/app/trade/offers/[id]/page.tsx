"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftRight, CheckCircle, XCircle, Star, Clock, Package,
  MessageSquare, ShieldAlert, ShieldOff, Shield, Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TrustBadge } from "@/components/trade/TrustBadge";
import { useToast } from "@/components/ui/Toast";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "待回覆", color: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30" },
  accepted:  { label: "已接受", color: "text-green-400 bg-green-900/20 border-green-700/30" },
  rejected:  { label: "已拒絕", color: "text-red-400 bg-red-900/20 border-red-700/30" },
  completed: { label: "已完成", color: "text-brand-400 bg-brand-900/20 border-brand-700/30" },
  cancelled: { label: "已取消", color: "text-gray-400 bg-gray-800/30 border-gray-700/30" },
};

const conditionColor: Record<string, string> = {
  M: "text-yellow-400", NM: "text-green-400", LP: "text-blue-400", MP: "text-orange-400", HP: "text-red-400",
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star className={`w-8 h-8 transition-colors ${n <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
        </button>
      ))}
    </div>
  );
}

export default function OfferDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewed, setReviewed] = useState(false);

  // Chat
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Block & fraud
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showFraudReport, setShowFraudReport] = useState(false);
  const [fraudReason, setFraudReason] = useState("");
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudDone, setFraudDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function loadOffer() {
    const res = await fetch(`/api/trade/offers/${params.id}`);
    if (res.ok) {
      const { offer } = await res.json();
      setOffer(offer);
      setReviewed(offer.has_my_review);
    }
    setLoading(false);
  }

  async function loadMessages() {
    setMessagesLoading(true);
    const res = await fetch(`/api/trade/offers/${params.id}/messages`);
    if (res.ok) {
      const { messages } = await res.json();
      setMessages(messages ?? []);
    }
    setMessagesLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    loadOffer();
    loadMessages();

    const channel = supabase
      .channel(`trade_chat_${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_messages", filter: `offer_id=eq.${params.id}` },
        (payload) => {
          setMessages(prev => {
            if (prev.some((m: any) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user || !offer) return;
    const otherId = offer.from_user_id === user.id ? offer.to_user_id : offer.from_user_id;
    fetch(`/api/users/${otherId}/block`)
      .then(r => r.json())
      .then(d => setIsBlocked(d.blocked ?? false));
  }, [user, offer]);

  async function updateStatus(status: string) {
    setActing(true);
    await fetch(`/api/trade/offers/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadOffer();
    setActing(false);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setActing(true);
    const res = await fetch("/api/trade/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: params.id, rating, comment }),
    });
    if (res.ok) {
      setReviewed(true);
      setRating(0);
      setComment("");
      toast.success("評價已送出！");
    }
    setActing(false);
  }

  async function sendMessage() {
    if (!newMsg.trim() || sendingMsg) return;
    setSendingMsg(true);
    const res = await fetch(`/api/trade/offers/${params.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg.trim() }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages(prev => {
        if (prev.some((m: any) => m.id === message.id)) return prev;
        return [...prev, { ...message, profiles: { username: user?.user_metadata?.username, display_name: user?.user_metadata?.display_name } }];
      });
      setNewMsg("");
    } else {
      toast.error("發送失敗，請重試");
    }
    setSendingMsg(false);
  }

  async function toggleBlock() {
    if (!offer) return;
    setBlockLoading(true);
    const otherId = offer.from_user_id === user?.id ? offer.to_user_id : offer.from_user_id;
    const method = isBlocked ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${otherId}/block`, { method });
    if (res.ok) {
      const data = await res.json();
      setIsBlocked(data.blocked);
      toast.success(data.blocked ? "已封鎖此用戶" : "已解除封鎖");
    }
    setBlockLoading(false);
  }

  async function submitFraudReport() {
    if (!fraudReason || !offer) return;
    setFraudLoading(true);
    const otherId = offer.from_user_id === user?.id ? offer.to_user_id : offer.from_user_id;
    const res = await fetch("/api/trade/fraud-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reported_user_id: otherId, offer_id: params.id, reason: fraudReason }),
    });
    if (res.ok) {
      setFraudDone(true);
      setShowFraudReport(false);
      toast.success("詐騙回報已送出，感謝你的回報！");
    } else {
      const { error } = await res.json();
      toast.error(error ?? "送出失敗");
    }
    setFraudLoading(false);
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 shimmer" />)}
    </div>
  );
  if (!offer) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500">找不到此提案</div>;

  const isRecipient = offer.to_user_id === user?.id;
  const isSender = offer.from_user_id === user?.id;
  const otherUser = isRecipient ? offer.from_profile : offer.to_profile;
  const s = statusConfig[offer.status] ?? statusConfig.pending;
  const offerItems = offer.items.filter((it: any) => it.direction === "offer");
  const requestItems = offer.items.filter((it: any) => it.direction === "request");
  const isActive = offer.status !== "cancelled" && offer.status !== "rejected";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/trade/offers" className="text-gray-400 hover:text-gray-200">
          <ArrowLeftRight className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">換卡提案詳情</h1>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${s.color}`}>{s.label}</span>
      </div>

      {/* Counterparty */}
      <div className="glass rounded-xl p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {otherUser?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="font-semibold text-white">{otherUser?.display_name ?? otherUser?.username}</div>
          <TrustBadge userId={isRecipient ? offer.from_user_id : offer.to_user_id} size="sm" />
        </div>
      </div>

      {/* Cards being traded */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {offerItems.length > 0 && (
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> {isSender ? "我提供的牌" : "他提供的牌"}
            </div>
            {offerItems.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-xs bg-blue-900/10 border border-blue-800/30 rounded-lg px-3 py-2">
                <span className="text-gray-200">{it.have?.card_name ?? "—"}</span>
                <span className={`font-bold ${conditionColor[it.have?.condition] ?? ""}`}>{it.have?.condition}</span>
              </div>
            ))}
          </div>
        )}
        {requestItems.length > 0 && (
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> {isSender ? "我想換的牌" : "他想換的牌"}
            </div>
            {requestItems.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-xs bg-green-900/10 border border-green-800/30 rounded-lg px-3 py-2">
                <span className="text-gray-200">{it.have?.card_name ?? "—"}</span>
                <span className={`font-bold ${conditionColor[it.have?.condition] ?? ""}`}>{it.have?.condition}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Initial message */}
      {offer.message && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-gray-300 italic">
          「{offer.message}」
        </div>
      )}

      {/* Date */}
      <div className="text-xs text-gray-600 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> 提案時間：{new Date(offer.created_at).toLocaleString("zh-TW")}
      </div>

      {/* Status actions */}
      {offer.status === "pending" && isRecipient && (
        <div className="flex gap-3">
          <button onClick={() => updateStatus("accepted")} disabled={acting}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
            <CheckCircle className="w-4 h-4" /> 接受提案
          </button>
          <button onClick={() => updateStatus("rejected")} disabled={acting}
            className="flex-1 bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <XCircle className="w-4 h-4" /> 拒絕
          </button>
        </div>
      )}

      {offer.status === "pending" && isSender && (
        <button onClick={() => updateStatus("cancelled")} disabled={acting}
          className="w-full bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:bg-gray-800/60 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          取消提案
        </button>
      )}

      {offer.status === "accepted" && (
        <button onClick={() => updateStatus("completed")} disabled={acting}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> 確認換卡完成
        </button>
      )}

      {/* Review form */}
      {offer.status === "completed" && !reviewed && (
        <div className="glass rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" /> 留下評價
          </h2>
          <form onSubmit={submitReview} className="space-y-3">
            <StarRating value={rating} onChange={setRating} />
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="填寫評價（選填）…"
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            <button type="submit" disabled={!rating || acting}
              className="btn-primary w-full text-sm disabled:opacity-50">
              送出評價
            </button>
          </form>
        </div>
      )}

      {offer.status === "completed" && reviewed && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> 你已完成評價
        </div>
      )}

      {/* Chat room */}
      {isActive && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-bold text-white">交易聊天室</h2>
          </div>

          <div className="h-72 overflow-y-auto p-4 space-y-3">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-600">載入訊息…</div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-600">
                還沒有訊息，先打個招呼吧！
              </div>
            ) : messages.map((msg: any) => {
              const isMe = msg.sender_id === user?.id;
              const senderName = msg.profiles?.display_name ?? msg.profiles?.username ?? "對方";
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isMe
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-white/8 text-gray-200 rounded-bl-sm"
                  }`}>
                    {!isMe && (
                      <div className="text-[10px] font-medium text-gray-400 mb-1">{senderName}</div>
                    )}
                    <p className="break-words leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? "text-white/50" : "text-gray-600"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-white/5 flex gap-2">
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="輸入訊息… (Enter 送出)"
              maxLength={500}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sendingMsg}
              className="btn-primary px-4 py-2 flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Safety section */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> 安全機制
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleBlock}
            disabled={blockLoading}
            className={`flex-1 text-xs py-2.5 rounded-xl border transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
              isBlocked
                ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                : "bg-orange-900/20 border-orange-800/30 text-orange-400 hover:bg-orange-900/30"
            }`}
          >
            <ShieldOff className="w-3.5 h-3.5" />
            {isBlocked ? "已封鎖（點擊解除）" : "封鎖此用戶"}
          </button>

          {(offer.status === "accepted" || offer.status === "completed") && !fraudDone && (
            <button
              onClick={() => setShowFraudReport(true)}
              className="flex-1 text-xs py-2.5 rounded-xl border bg-red-900/20 border-red-800/30 text-red-400 hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> 詐騙回報
            </button>
          )}

          {fraudDone && (
            <div className="flex-1 text-xs py-2.5 rounded-xl border bg-gray-800/20 border-gray-700/20 text-gray-500 flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> 已提交回報
            </div>
          )}
        </div>
      </div>

      {/* Fraud report modal */}
      {showFraudReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowFraudReport(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "#0f0f14", border: "1px solid #2a2a3a" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-white">詐騙回報</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-gray-400">請選擇遇到的問題，我們會盡快審核處理。</p>
              <div className="space-y-2">
                {["收到卡況不符", "對方沒有寄出卡牌", "描述不實", "惡意取消交易", "其他"].map(r => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="fraud_reason"
                      value={r}
                      checked={fraudReason === r}
                      onChange={() => setFraudReason(r)}
                      className="accent-red-500 w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">{r}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowFraudReport(false)}
                  className="flex-1 bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 rounded-xl py-2.5 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={submitFraudReport}
                  disabled={!fraudReason || fraudLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {fraudLoading ? "送出中…" : "送出回報"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
