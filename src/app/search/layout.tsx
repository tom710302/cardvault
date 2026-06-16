import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "搜尋",
  description: "搜尋卡牌、店家與社群文章，快速找到你需要的收藏資訊。",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
