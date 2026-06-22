import { StaticPage } from "@/components/ui/StaticPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "關於我們 | Cardreasch" };

export default function AboutPage() {
  return <StaticPage settingKey="page_about" title="關於我們" />;
}
