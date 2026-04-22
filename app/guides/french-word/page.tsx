"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
} from "lucide-react";
import { SpeakButton, CopyChip } from "@/components/BusinessCardUI";
import {
  getEntryByOffset,
  pickEntryForDate,
  type FrenchDailyEntry,
} from "@/lib/french-word-of-the-day";

function formatDate(d: Date): string {
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

export default function FrenchWordPage() {
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  const { entry, date } = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return { entry: offset === 0 ? pickEntryForDate(new Date()) : getEntryByOffset(offset), date: d };
  }, [offset]);

  const shareText = useMemo(
    () =>
      `【每日法语一词】${entry.word}（${entry.pos}）— ${entry.zh}\n例句：${entry.example}\n${entry.exampleZh}\n\n悄悄学，惊艳所有人。\n— 刚果金华人生活服务指南`,
    [entry]
  );

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "每日法语一词", text: shareText });
        return;
      } catch {
        /* 用户取消或系统拒绝，退回复制 */
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-white pb-20">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-rose-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/useful"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-rose-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-rose-400 rounded-full" />
            <h1 className="text-base font-bold text-gray-800">每日法语一词</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* 日期导航 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="前一天"
            className="w-8 h-8 rounded-full bg-white border border-rose-200 text-gray-600 hover:bg-rose-50 flex items-center justify-center active:scale-95 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-xs text-gray-600 font-medium">
            {formatDate(date)}
            {offset === 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold">
                <Sparkles size={10} fill="currentColor" /> 今日
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            aria-label="后一天"
            className="w-8 h-8 rounded-full bg-white border border-rose-200 text-gray-600 hover:bg-rose-50 flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 主卡片 — 渐入切换 */}
        <WordCard key={`${entry.word}-${offset}`} entry={entry} />

        {/* 分享 */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={share}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold shadow-sm active:scale-95 transition"
          >
            <Share2 size={15} />
            {copied ? "已复制到剪贴板" : "分享到群里"}
          </button>
          <CopyChip text={entry.word} label="复制单词" doneLabel="已复制" />
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400 leading-relaxed">
          每天一个词，地道但不烂大街。<br />
          悄悄学，惊艳所有人。
        </p>
      </main>
    </div>
  );
}

function WordCard({ entry }: { entry: FrenchDailyEntry }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // 下一帧触发透明度 0 → 1，避免瞬间闪现
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`bg-white rounded-3xl shadow-md border border-rose-100 overflow-hidden transition-opacity duration-300 ease-out ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          Mot du jour
        </p>
        <div className="mt-1 flex items-end gap-2 flex-wrap">
          <h2 className="text-3xl md:text-4xl font-black leading-tight drop-shadow">
            {entry.word}
          </h2>
          <span className="text-xs font-medium text-white/80 pb-1">{entry.pos}</span>
        </div>
        <p className="mt-2 text-base font-semibold text-white drop-shadow-sm">
          {entry.zh}
        </p>
        <div className="mt-3">
          <SpeakButton text={entry.word} cacheKey={`fwod-${entry.word}`} />
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        <Block title="用法小贴士" body={entry.tip} tone="tip" />
        <div>
          <p className="text-[11px] text-rose-500 font-semibold tracking-wider uppercase mb-1.5">
            例句
          </p>
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 space-y-2">
            <p className="text-sm text-gray-900 font-medium leading-snug">
              {entry.example}
            </p>
            <p className="text-xs text-gray-600 leading-snug">{entry.exampleZh}</p>
            <SpeakButton text={entry.example} cacheKey={`fwod-ex-${entry.word}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "tip";
}) {
  const toneCls =
    tone === "tip"
      ? "bg-amber-50 border-amber-100 text-amber-800"
      : "bg-gray-50 border-gray-100 text-gray-700";
  return (
    <div className={`rounded-2xl border p-3 ${toneCls}`}>
      <p className="text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-1">
        {title}
      </p>
      <p className="text-sm leading-snug">{body}</p>
    </div>
  );
}
