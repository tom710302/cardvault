"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}

async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
}

export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("PushManager" in window) ||
      !("serviceWorker" in navigator) ||
      Notification.permission !== "default" ||
      localStorage.getItem("push_dismissed") === "1"
    ) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setShow(true);
    });
  }, []);

  if (!show) return null;

  async function handleAllow() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribe();
        setShow(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
    setLoading(false);
  }

  function dismiss() {
    localStorage.setItem("push_dismissed", "1");
    setShow(false);
  }

  return (
    <div className="fixed bottom-20 inset-x-0 z-40 flex justify-center px-4 md:bottom-4">
      <div className="glass border border-brand-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 max-w-sm w-full shadow-xl">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-brand-400" />
        </div>
        <p className="flex-1 text-sm text-gray-200 leading-snug">
          開啟通知，即時收到換卡提案與訊息
        </p>
        <button
          onClick={handleAllow}
          disabled={loading}
          className="shrink-0 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "處理中" : "開啟"}
        </button>
        <button onClick={dismiss} className="text-gray-500 hover:text-gray-300 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
