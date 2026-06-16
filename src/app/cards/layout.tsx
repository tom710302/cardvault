import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "卡牌資料庫",
  description: "查詢 TCG 與球員卡的市場價格、系列資訊與社群回報，建立你的收藏參考。",
};

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
