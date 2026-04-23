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
  Copy,
  Check,
} from "lucide-react";
import { type Business, categories } from "@/lib/businesses";
import { ProtectedImg } from "@/components/ProtectedImg";

const NEW_UPDATE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function hasFreshUpdate(biz: Business): boolean {
  if (!biz.updates || biz.updates.length === 0) return false;
  const latestAt = biz.updates[0]?.at;
  if (!latestAt) return false;
  const t = Date.parse(latestAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= NEW_UPDATE_WINDOW_MS;
}

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
        <ProtectedImg src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
        {biz.featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full shadow flex items-center gap-1">
            <Star size={12} fill="white" /> 热门
          </span>
        )}
        {hasFreshUpdate(biz) && (
          <span
            className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[10.5px] font-black rounded-full shadow-lg animate-pulse"
            aria-label="有最新动态"
          >
            ✨ 新动态
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
            text={`Je veux aller à cette adresse, ${biz.address || biz.area}`}
            cacheKey={`biz-${biz.id}-addr`}
          />
        </div>

        <div className="mt-3 space-y-2">
          {biz.address && (
            <Row
              icon={<MapPin size={15} className="text-red-400" />}
              text={biz.address}
            />
          )}
          <Row icon={<Store size={15} className="text-sky-400" />} text={biz.mainService} clamp />
          <Row icon={<MapPin size={15} className="text-gray-400" />} text={`所在区域：${biz.area}`} />
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

// 44 字节静音 WAV（PCM 1 ch / 24kHz / 16bit / 0 sample），用来在用户手势 tick
// 里先把 <audio> 元素"解锁"，后续异步 fetch 回来再 audio.play() 就不会被 iOS 阻拦
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=";

export function SpeakButton({
  text,
  cacheKey,
  label = "法语播报地址",
}: {
  text: string;
  cacheKey?: string;
  label?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  const reportError = (stage: string, extra?: unknown) => {
    // 失败只打 console，不 alert 吓用户 — 按钮会自动恢复成可点状态
    console.error(`[SpeakButton] ${stage}`, extra);
  };

  const speak = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);

    // 1) 确保 audio 元素存在，并且在"用户点击这一 tick"里先把它解锁
    //    iOS Safari 要求 audio.play() 的首次调用发生在用户手势里；
    //    先用静音 WAV 同步 play 一次，之后即使 await 了 fetch，再 play() 也不会被拒
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    audio.onended = null;
    audio.onerror = null;

    if (!unlockedRef.current) {
      try {
        audio.muted = true;
        audio.src = SILENT_WAV;
        const p = audio.play();
        if (p && typeof p.then === "function") {
          await p.catch(() => {});
        }
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        unlockedRef.current = true;
      } catch {
        // 解锁失败也继续尝试真实播放 — 桌面浏览器完全不需要解锁
      }
    }

    // 2) 拉取真正的音频（命中 Blob 缓存时 < 200ms，冷启动时 1~3s）
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

    // 3) 复用已解锁的 <audio>：替换 src 再 play，iOS 不会再被拒
    audio.src = audioUrl;
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
      aria-label={`${label}：${text}`}
      title={`点击用法语朗读：${text}`}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95 ${
        speaking
          ? "bg-red-100 text-red-500 animate-pulse"
          : "bg-sky-100 text-sky-600 hover:bg-sky-200 active:bg-sky-200"
      }`}
    >
      <Volume2 size={16} />
      <span>{label}</span>
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

export function Field({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  const empty = !value || !value.trim();
  return (
    <div>
      <p className="text-gray-400 text-xs tracking-wide mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p
          className={`flex-1 min-w-0 leading-relaxed ${
            empty ? "text-gray-400 italic" : "text-gray-700"
          }`}
        >
          {empty ? "待补充" : value}
        </p>
        {action && !empty && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function CopyChip({
  text,
  label = "复制",
  doneLabel = "已复制",
}: {
  text: string;
  label?: string;
  doneLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const doCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={doCopy}
      aria-label={copied ? doneLabel : label}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors active:scale-95 ${
        copied
          ? "bg-emerald-100 text-emerald-600"
          : "bg-sky-100 text-sky-600 hover:bg-sky-200"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? doneLabel : label}</span>
    </button>
  );
}

export function WhatsAppChip({ phone }: { phone: string }) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 text-xs font-semibold transition-colors active:scale-95"
      aria-label="WhatsApp 联系"
    >
      <MessageCircle size={13} />
      <span>WhatsApp</span>
    </a>
  );
}

export function CallChip({ phone }: { phone: string }) {
  const digits = phone.replace(/[^0-9+]/g, "");
  if (!digits) return null;
  return (
    <a
      href={`tel:${digits}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 text-xs font-semibold transition-colors active:scale-95"
      aria-label="拨打电话"
    >
      <Phone size={13} />
      <span>拨号</span>
    </a>
  );
}
