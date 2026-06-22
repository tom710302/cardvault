"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-TW">
      <body style={{ background: "#060610", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", color: "#fff", padding: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>應用程式發生嚴重錯誤</h1>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "1.5rem" }}>請重新整理頁面</p>
          <button
            onClick={reset}
            style={{ background: "#4149f5", color: "#fff", border: "none", borderRadius: "0.75rem", padding: "0.625rem 1.5rem", fontSize: "0.875rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            重新整理
          </button>
        </div>
      </body>
    </html>
  );
}
