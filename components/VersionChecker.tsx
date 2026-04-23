"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const POLL_MS = 60_000;

async function hardReload() {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
    }
  } catch {
    /* ignore */
  }
  // 加个 _v 查询参数强制绕过任何中间缓存
  const u = new URL(window.location.href);
  u.searchParams.set("_v", String(Date.now()));
  window.location.replace(u.toString());
}

export default function VersionChecker() {
  const [stale, setStale] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let alive = true;
    let current: string | null = null;

    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v?: string };
        if (!alive || !v) return;
        if (current && current !== v) {
          setStale(true);
        } else if (!current) {
          current = v;
        }
      } catch {
        /* ignore — 离线也不打扰 */
      }
    };

    check();
    const t = window.setInterval(check, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // fade-in：stale 变 true 时延一帧把 mounted 拉起来，让 opacity 过渡
  useEffect(() => {
    if (!stale) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [stale]);

  if (!stale) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[60] transition-all duration-300 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-center gap-2 bg-gray-900/95 text-white text-[12px] px-3 py-2 rounded-full shadow-lg backdrop-blur">
        <RefreshCw size={13} className="text-sky-300" />
        <span>有新版本可用</span>
        <button
          onClick={hardReload}
          className="ml-1 px-2.5 py-0.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-full active:scale-95 transition"
        >
          刷新
        </button>
      </div>
    </div>
  );
}
