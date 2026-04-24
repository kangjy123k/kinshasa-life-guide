"use client";

import { useEffect, useState } from "react";

export default function ShareGuideOverlay({
  type,
  shareTitle,
}: {
  type: "chat" | "moments";
  shareTitle: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] bg-black/85 flex flex-col items-end p-4 transition-opacity duration-300 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => setDismissed(true)}
    >
      <div className="flex flex-col items-end gap-2 pr-3">
        <svg width="72" height="90" viewBox="0 0 72 90" fill="none" aria-hidden>
          <path
            d="M56 80 Q56 40 56 15"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 6"
            fill="none"
          />
          <path
            d="M48 18 L56 8 L64 18"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <div className="mt-2 w-full max-w-xs mx-auto text-center">
        <p className="text-white text-lg font-black">点右上角「…」</p>
        <p className="text-white/90 text-base mt-1">
          选择「
          {type === "chat" ? "发送给朋友" : "分享到朋友圈"}
          」
        </p>
        <p className="text-white/70 text-xs mt-3">
          微信会根据本页自动生成带图卡片
        </p>
      </div>
      <div className="mt-auto w-full max-w-xs mx-auto mb-6 space-y-3">
        <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-center">
          <p className="text-[11px] text-white/60">即将分享</p>
          <p className="text-sm text-white font-bold mt-0.5 truncate">
            {shareTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="w-full py-2.5 bg-white/15 text-white text-sm font-semibold rounded-full active:bg-white/25"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
