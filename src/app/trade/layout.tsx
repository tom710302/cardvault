import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "換卡系統",
  description: "登記可換與想換的卡牌，配對社群中的其他收藏家，安全完成換卡交易。",
};

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
