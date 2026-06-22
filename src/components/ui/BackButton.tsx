"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ href, label }: { href?: string; label?: string }) {
  const router = useRouter();
  const handleClick = () => (href ? router.push(href) : router.back());
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {label && <span>{label}</span>}
    </button>
  );
}
