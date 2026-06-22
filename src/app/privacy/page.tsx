import { StaticPage } from "@/components/ui/StaticPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "隱私政策 | Cardreasch" };

export default function PrivacyPage() {
  return <StaticPage settingKey="page_privacy" title="隱私政策" />;
}
