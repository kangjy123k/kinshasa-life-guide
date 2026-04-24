"use client";

import { useEffect } from "react";

import { getDeployVersion } from "@/lib/deploy-version";

// 进站后把当前部署 sha 贴到地址栏的 ?v= 上，让用户顺手复制链接就自带版本号
// 目的：微信按 URL 缓存卡片预览（图 + 标题 + 副标题），部署更新后旧 URL 拿到的
// 仍是旧卡片；而新 URL（?v=<新 sha>）会触发微信重新抓取 og tag 和 OG 图
export default function VersionStamp() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const stamp = async () => {
      const v = await getDeployVersion();
      if (cancelled || !v) return;
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("v") === v) return;
        url.searchParams.set("v", v);
        // 保留当前 history state（home/category/business 层级），只改 URL
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search + url.hash,
        );
      } catch {
        /* ignore */
      }
    };
    // 让 page.tsx 自己的 replaceState/pushState 先跑完，再贴 v
    const id = setTimeout(stamp, 80);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  return null;
}
