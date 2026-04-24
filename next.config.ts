import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // 放开 /_next/image 优化器的源白名单 — 用于给分享页 OG 图做缩小转码
  // 微信朋友圈爬虫超时短，原图 1600×1200 300KB 太慢；转码成 webp 640 后
  // 边缘缓存，加载快几倍
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "share.blackstream.site" },
      { protocol: "https", hostname: "kinshasa-life-guide.vercel.app" },
    ],
    formats: ["image/webp"],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
