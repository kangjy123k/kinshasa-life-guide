import type { MetadataRoute } from "next";

// PWA manifest —— 供"添加到主屏幕"与 TWA/APK 打包(PWABuilder)读取。
// 仅元数据，不影响任何 API / 数据 / 页面逻辑。
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "刚果金华人生活服务指南",
    short_name: "华人指南",
    description:
      "帮助刚果金华人更快找到本地服务 — 商品 · 餐厅 · 住宿 · 服务 · 租赁 · 二手 · 线下活动",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "zh",
    dir: "ltr",
    background_color: "#f0f9ff",
    theme_color: "#0ea5e9",
    categories: ["lifestyle", "business", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
