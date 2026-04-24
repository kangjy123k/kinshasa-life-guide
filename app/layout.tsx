import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import VersionChecker from "@/components/VersionChecker";

export const metadata: Metadata = {
  metadataBase: new URL("https://kinshasa-life-guide.vercel.app"),
  title: "刚果金华人生活服务指南",
  description:
    "帮助刚果金华人更快找到本地服务 — 商品 · 餐厅 · 住宿 · 服务 · 租赁 · 二手专区 · 线下活动",
  openGraph: {
    type: "website",
    siteName: "刚果金华人生活服务指南",
    title: "刚果金华人生活服务指南",
    // 换行符在微信小卡片里会被压成空格/分隔，用"·"让两句都露出来
    description: "商家免费入驻中 · 随便逛逛有惊喜",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "刚果金华人生活服务指南",
    description: "商家免费入驻中 · 随便逛逛有惊喜",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0ea5e9",
};

const swRegister = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" className="h-full antialiased">
      <head>
        <link rel="preload" as="fetch" href="/api/public/approved" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: swRegister }} />
      </head>
      <body className="min-h-full bg-sky-50">
        {children}
        <BottomNav />
        <VersionChecker />
      </body>
    </html>
  );
}
