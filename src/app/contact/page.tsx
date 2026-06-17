import { StaticPage } from "@/components/ui/StaticPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "聯絡我們 | CardVault" };

export default function ContactPage() {
  return <StaticPage settingKey="page_contact" title="聯絡我們" />;
}
