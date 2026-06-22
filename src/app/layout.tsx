import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { PushPrompt } from "@/components/PushPrompt";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmModal";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cardvault-beta.vercel.app";
const siteName = "Cardreasch";
const defaultTitle = "Cardreasch — 實體卡牌收藏交流平台";
const defaultDescription = "TCG 與球員卡收藏家的社群交流、價格參考、收藏展示平台";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s — ${siteName}` },
  description: defaultDescription,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName,
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: siteUrl,
    siteName,
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="theme-color" content="#4149f5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <ToastProvider>
        <ConfirmProvider>
          <Navbar />
          <main className="min-h-screen pb-16 md:pb-0">{children}</main>
          <div className="hidden md:block"><Footer /></div>
          <BottomNav />
          <PushPrompt />
        </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
