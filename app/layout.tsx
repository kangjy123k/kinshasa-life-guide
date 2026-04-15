import type { Metadata } from "next";
import { Ma_Shan_Zheng } from "next/font/google";
import "./globals.css";

const handwriting = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-handwriting",
  display: "swap",
});

export const metadata: Metadata = {
  title: "刚果金华人生活服务指南",
  description: "帮助刚果金华人更快找到本地服务 — 商品 · 餐厅 · 住宿 · 服务 · 租赁 · 招聘求职 · 二手专区",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" className={`h-full antialiased ${handwriting.variable}`}>
      <body className="min-h-full bg-sky-50">{children}</body>
    </html>
  );
}
