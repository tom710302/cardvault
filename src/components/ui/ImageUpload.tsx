"use client";

import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  onRemove?: () => void;
  currentUrl?: string;
  folder?: string;
  className?: string;
  label?: string;
  hint?: string;
}

export function ImageUpload({ onUpload, onRemove, currentUrl, folder = "general", className, label = "上傳圖片", hint = "JPG、PNG、WebP，最大 5MB" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "上傳失敗");
    } else {
      setPreview(data.url);
      onUpload(data.url);
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function remove() {
    setPreview("");
    onRemove?.();
    if (inputRef.current) inputRef.current.value = "";
  }

  if (preview) {
    return (
      <div className={cn("relative rounded-xl overflow-hidden", className)}>
        <img src={preview} alt="上傳圖片" className="w-full h-full object-cover" />
        <button onClick={remove}
          className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-white/15 hover:border-brand-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group"
      >
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-sm text-gray-400">上傳中...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center group-hover:bg-brand-600/30 transition-colors">
              <ImageIcon className="w-6 h-6 text-brand-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
              <p className="text-xs text-gray-600 mt-1">點擊或拖放圖片到此</p>
            </div>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
    </div>
  );
}
