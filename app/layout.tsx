import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "刚果金华人生活服务指南",
  description:
    "帮助刚果金华人更快找到本地服务 — 商品 · 餐厅 · 住宿 · 服务 · 租赁 · 招聘求职 · 二手专区",
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
        <script dangerouslySetInnerHTML={{ __html: swRegister }} />
      </head>
      <body className="min-h-full bg-sky-50">{children}</body>
    </html>
  );
}
