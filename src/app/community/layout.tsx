import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "社群討論",
  description: "與 TCG 及球員卡收藏家交流討論、分享展示、詢價詢問，掌握最新收藏動態。",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
