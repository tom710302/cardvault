import { StaticPage } from "@/components/ui/StaticPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "使用條款 | Cardreasch" };

export default function TermsPage() {
  return <StaticPage settingKey="page_terms" title="使用條款" />;
}
