"use client";

import { useRef, useState } from "react";
import {
  MapPin,
  Phone,
  MessageCircle,
  Store,
  ChevronRight,
  Star,
  Volume2,
} from "lucide-react";
import { type Business, categories } from "@/lib/businesses";

export function BusinessCard({
  biz,
  onOpen,
}: {
  biz: Business;
  onOpen?: (id: number) => void;
}) {
  const cat = categories.find((c) => c.key === biz.category);
  const handleOpen = () => onOpen?.(biz.id);

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? handleOpen : undefined}
      onKeyDown={(e) => {
        if (!onOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden transition-all hover:shadow-md hover:border-red-200 active:scale-[0.99] cursor-pointer"
    >
      <div className="relative h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
        {biz.featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full shadow flex items-center gap-1">
            <Star size={12} fill="white" /> 热门
          </span>
        )}
        <span className="absolute top-3 right-3 px-2.5 py-1 bg-sky-500 text-white text-xs font-semibold rounded-full shadow">
          {cat?.label}
          {biz.subcategory ? ` · ${biz.subcategory}` : ""}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 leading-snug">{biz.name}</h3>
            {biz.englishName && (
              <p className="text-[11px] text-gray-500 leading-snug mt-0.5 truncate" title={biz.englishName}>
                {biz.englishName}
              </p>
            )}
          </div>
          <SpeakButton
            text={`Je veux aller à cette adresse, ${biz.area}`}
            cacheKey={`biz-${biz.id}`}
          />
        </div>

        <div className="mt-3 space-y-2">
          <Row icon={<MapPin size={15} className="text-red-400" />} text={biz.area} />
          <Row icon={<Store size={15} className="text-sky-400" />} text={biz.mainService} clamp />
        </div>

        {onOpen && (
          <div className="mt-3 flex items-center justify-end text-sm text-red-500 font-medium">
            进入详情页 <ChevronRight size={14} className="ml-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactButtons({ biz, className = "" }: { biz: Business; className?: string }) {
  const hasPhone = !!biz.phone?.trim();
  const hasWechat = !!biz.wechat?.trim();
  if (!hasPhone && !hasWechat) {
    return (
      <p className={`text-sm text-gray-400 italic ${className}`}>
        暂无联系方式 · 请到店咨询
      </p>
    );
  }
  return (
    <div className={`flex gap-2 ${className}`}>
      {hasPhone && (
        <a
          href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-400 text-white text-sm font-semibold rounded-xl hover:bg-red-500 transition-colors"
        >
          <Phone size={14} /> WhatsApp 联系
        </a>
      )}
      {hasWechat && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(biz.wechat);
            alert(`已复制微信号：${biz.wechat}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
        >
          <MessageCircle size={14} /> 复制微信号
        </button>
      )}
    </div>
  );
}

function hashText(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(36);
}

export function SpeakButton({ text, cacheKey }: { text: string; cacheKey?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reportError = (stage: string, extra?: unknown) => {
    console.error(`[SpeakButton] ${stage}`, extra);
    alert(
      `法语朗读失败（${stage}）。请检查：\n` +
        `• 网络 / 后端 /api/speak 是否 200\n` +
        `• GEMINI_API_KEY 是否已在 .env.local 配置并重启 dev\n` +
        `• Gemini 配额是否耗尽\n` +
        `（详细错误已打到控制台）`
    );
  };

  const speak = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);

    const fullCacheKey = cacheKey ? `${cacheKey}-${hashText(text)}` : undefined;
    let res: Response;
    try {
      res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, cacheKey: fullCacheKey }),
      });
    } catch (err) {
      setSpeaking(false);
      reportError("网络请求失败", err);
      return;
    }

    if (!res.ok) {
      let detail: unknown = null;
      try {
        detail = await res.json();
      } catch {
        /* ignore */
      }
      setSpeaking(false);
      reportError(`HTTP ${res.status}`, detail);
      return;
    }

    let audioUrl: string;
    let revoke = () => {};
    try {
      const ctype = res.headers.get("Content-Type") ?? "";
      if (ctype.includes("application/json")) {
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("response missing url");
        audioUrl = data.url;
      } else {
        const blob = await res.blob();
        if (!blob.size) throw new Error("empty audio blob");
        audioUrl = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (err) {
      setSpeaking(false);
      reportError("解析响应失败", err);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setSpeaking(false);
      revoke();
    };
    audio.onerror = () => {
      setSpeaking(false);
      revoke();
      reportError("音频解码/播放失败", audio.error);
    };
    try {
      await audio.play();
    } catch (err) {
      setSpeaking(false);
      revoke();
      reportError("audio.play() 被拒", err);
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`法语播报地址：${text}`}
      title={`点击用法语朗读：${text}`}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95 ${
        speaking
          ? "bg-red-100 text-red-500 animate-pulse"
          : "bg-sky-100 text-sky-600 hover:bg-sky-200 active:bg-sky-200"
      }`}
    >
      <Volume2 size={16} />
      <span>法语播报地址</span>
    </button>
  );
}

export function Row({ icon, text, clamp }: { icon: React.ReactNode; text: string; clamp?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-600">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={clamp ? "line-clamp-1" : ""}>{text}</span>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  const empty = !value || !value.trim();
  return (
    <div>
      <p className="text-gray-400 text-xs tracking-wide mb-0.5">{label}</p>
      <p className={`leading-relaxed ${empty ? "text-gray-400 italic" : "text-gray-700"}`}>
        {empty ? "待补充" : value}
      </p>
    </div>
  );
}
