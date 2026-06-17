"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

const ToastContext = createContext<{ show: (message: string, type: ToastType, duration: number) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    success: (message: string, duration = 3500) => ctx.show(message, "success", duration),
    error: (message: string, duration = 4500) => ctx.show(message, "error", duration),
    info: (message: string, duration = 3500) => ctx.show(message, "info", duration),
  };
}

const ICONS = { success: CheckCircle, error: XCircle, info: Info };
const COLORS: Record<ToastType, string> = {
  success: "border-green-700/40 bg-green-950/95 text-green-100",
  error: "border-red-700/40 bg-red-950/95 text-red-100",
  info: "border-brand-700/40 bg-brand-950/95 text-brand-100",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType, duration: number) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id}
              className={`flex items-start gap-2 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl text-sm ${COLORS[t.type]}`}>
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="flex-1 whitespace-pre-line leading-relaxed">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
