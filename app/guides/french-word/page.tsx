"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Flame,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SpeakButton, CopyChip } from "@/components/BusinessCardUI";
import {
  BANK,
  todayIndex,
  localDateString,
  mergeEntries,
  type FrenchDailyEntry,
} from "@/lib/french-word-of-the-day";
import { wm, wmDownload } from "@/lib/watermark";

const LS_KEY = "fwod-progress-v1";

interface Progress {
  learned: Record<string, string>; // word -> dateString
  streak: number;
  lastStudy: string | null;
  longestStreak: number;
}

function readProgress(): Progress {
  if (typeof window === "undefined") {
    return { learned: {}, streak: 0, lastStudy: null, longestStreak: 0 };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { learned: {}, streak: 0, lastStudy: null, longestStreak: 0 };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      learned: parsed.learned ?? {},
      streak: parsed.streak ?? 0,
      lastStudy: parsed.lastStudy ?? null,
      longestStreak: parsed.longestStreak ?? 0,
    };
  } catch {
    return { learned: {}, streak: 0, lastStudy: null, longestStreak: 0 };
  }
}

function writeProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* 容忍隐私模式 / 配额满 */
  }
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ua = Date.UTC(ay, am - 1, ad);
  const ub = Date.UTC(by, bm - 1, bd);
  return Math.round((ub - ua) / 86400_000);
}

function formatDateHuman(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dt.getDay()];
  return `${m}月${day}日 ${weekday}`;
}

export default function FrenchWordPage() {
  const [dynamicEntries, setDynamicEntries] = useState<FrenchDailyEntry[]>([]);
  const entries = useMemo(() => mergeEntries(BANK, dynamicEntries), [dynamicEntries]);
  const todayIdx = useMemo(() => todayIndex(entries), [entries]);
  const totalEntries = entries.length;
  const [index, setIndex] = useState(() => todayIndex(BANK));
  // 用户是否已手动翻页 — 没翻过就一直锁在今日(跟着 entries 更新)
  const userMovedRef = useRef(false);
  const [progress, setProgress] = useState<Progress>(() =>
    typeof window === "undefined"
      ? { learned: {}, streak: 0, lastStudy: null, longestStreak: 0 }
      : readProgress()
  );
  const [justLearned, setJustLearned] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showList, setShowList] = useState(false);

  // 客户端挂载后再读取 localStorage，避免 SSR 不一致
  useEffect(() => {
    setProgress(readProgress());
  }, []);

  // 拉取后台上传的动态词条（离线失败静默兜底为纯静态 BANK）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/fwod/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; entries?: FrenchDailyEntry[] }) => {
        if (cancelled) return;
        if (d?.ok && Array.isArray(d.entries)) setDynamicEntries(d.entries);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 用户没手动翻过 → 始终跟随今日。动态 API 到达后、日期跨天后都能正确追上。
  // 一旦用户按 prev/next / 滑动 / 词库点选，userMovedRef 置 true，之后保留用户位置。
  useEffect(() => {
    if (userMovedRef.current) {
      // 用户已翻页：只做范围夹取，避免 entries 变短后越界
      setIndex((cur) => Math.min(cur, Math.max(0, entries.length - 1)));
      return;
    }
    setIndex(todayIdx);
  }, [entries.length, todayIdx]);

  const entry = entries[Math.min(index, entries.length - 1)];
  const isToday = index === todayIdx;
  const canForward = index < todayIdx;
  const canBackward = index > 0;
  const learnedCount = Object.keys(progress.learned).length;
  const alreadyLearned = !!progress.learned[entry.word];

  // 进入 / 切到新词，自动标"已学"；只在查看今日词时推进 streak
  const markLearned = useCallback(
    (e: FrenchDailyEntry, tapToday: boolean) => {
      setProgress((prev) => {
        const already = !!prev.learned[e.word];
        const today = localDateString();
        let streak = prev.streak;
        let longest = prev.longestStreak;
        let lastStudy = prev.lastStudy;

        if (tapToday) {
          // 今日打卡：延续或重置 streak
          if (lastStudy === today) {
            // 今天已经打过卡，不变
          } else if (lastStudy && daysBetween(lastStudy, today) === 1) {
            streak = streak + 1;
          } else {
            streak = 1;
          }
          lastStudy = today;
          if (streak > longest) longest = streak;
        }

        const next: Progress = {
          learned: already
            ? prev.learned
            : { ...prev.learned, [e.word]: today },
          streak,
          longestStreak: longest,
          lastStudy,
        };
        writeProgress(next);

        if (!already) {
          setJustLearned(true);
          window.setTimeout(() => setJustLearned(false), 1400);

          const newCount = Object.keys(next.learned).length;
          const ms = milestoneFor(newCount, totalEntries);
          if (ms) {
            setMilestone(ms);
            window.setTimeout(() => setMilestone(null), 2600);
          }
        }

        return next;
      });
    },
    [totalEntries]
  );

  useEffect(() => {
    markLearned(entry, isToday);
  }, [entry, isToday, markLearned]);

  // 触摸滑动：右滑 → 看更早的日期；左滑 → 往今天走
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx > 0 && canBackward) {
      userMovedRef.current = true;
      setIndex((i) => i - 1);
    } else if (dx < 0 && canForward) {
      userMovedRef.current = true;
      setIndex((i) => i + 1);
    }
  };

  const shareText = useMemo(
    () =>
      `【每日法语一词 · ${formatDateHuman(entry.date)}】\n${entry.word}（${entry.pos}） ≈ ${entry.pron}\n${entry.zh}\n例：${entry.example}\n　　${entry.exampleZh}\n\n在"刚果金华人生活服务指南"里打卡，悄悄学，惊艳所有人。`,
    [entry]
  );

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "每日法语一词", text: shareText });
        return;
      } catch {
        /* 用户取消就回退到复制 */
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 浏览器拒绝剪贴板也不报错 */
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-white pb-24"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-rose-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/useful"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-rose-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-1 h-5 bg-rose-400 rounded-full shrink-0" />
            <h1 className="text-base font-bold text-gray-800 truncate">每日法语一词</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowList(true)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 active:scale-95 transition px-2 py-1 rounded-lg"
          >
            词库
          </button>
        </div>

        {/* 打卡状态条 */}
        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-semibold">
              <Flame size={12} fill="currentColor" />
              连续 {progress.streak} 天
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-semibold">
              <Trophy size={12} fill="currentColor" />
              已学 {learnedCount} / {totalEntries}
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-500"
                style={{ width: `${(learnedCount / totalEntries) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* 日期导航 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              if (!canBackward) return;
              userMovedRef.current = true;
              setIndex((i) => i - 1);
            }}
            disabled={!canBackward}
            aria-label="前一天"
            className="w-9 h-9 rounded-full bg-white border border-rose-200 text-gray-600 hover:bg-rose-50 flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-700 font-semibold">
              {formatDateHuman(entry.date)}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {isToday && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold">
                  <Sparkles size={10} fill="currentColor" /> 今日
                </span>
              )}
              {alreadyLearned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                  <Check size={10} strokeWidth={3} /> 已学
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!canForward) return;
              userMovedRef.current = true;
              setIndex((i) => i + 1);
            }}
            disabled={!canForward}
            aria-label="后一天"
            className="w-9 h-9 rounded-full bg-white border border-rose-200 text-gray-600 hover:bg-rose-50 flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 主卡片 */}
        <WordCard key={entry.word} entry={entry} />

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
          左右滑动切换日期，每天一词，坚持就是学法语。<br />
          悄悄学，惊艳所有人。
        </p>
      </main>

      {/* 小庆祝：新词点亮 */}
      {justLearned && (
        <div className="fixed inset-x-0 top-24 z-30 flex justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg animate-slide-in">
            <Check size={14} className="inline -mt-0.5 mr-1" strokeWidth={3} /> 学过一个新词！
          </div>
        </div>
      )}

      {/* 里程碑弹层 */}
      {milestone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
          <div className="bg-gradient-to-br from-rose-500 to-amber-500 text-white px-8 py-6 rounded-3xl shadow-2xl text-center animate-slide-in">
            <Trophy size={40} fill="currentColor" className="mx-auto mb-2 drop-shadow" />
            <p className="text-lg font-bold">{milestone}</p>
          </div>
        </div>
      )}

      {/* 词库总览 */}
      {showList && (
        <WordListSheet
          entries={entries}
          currentIndex={index}
          learned={progress.learned}
          todayIdx={todayIdx}
          onClose={() => setShowList(false)}
          onPick={(i) => {
            userMovedRef.current = true;
            setIndex(i);
            setShowList(false);
          }}
        />
      )}
    </div>
  );
}

function milestoneFor(learned: number, total: number): string | null {
  if (learned === 5) return "学满 5 个词，开了个好头！";
  if (learned === 10) return "已掌握 10 个，刚果金基本沟通不愁！";
  if (learned === total) return `${total} 个词全部拿下，恭喜出师！`;
  return null;
}

function WordCard({ entry }: { entry: FrenchDailyEntry }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`bg-white rounded-3xl shadow-md border border-rose-100 overflow-hidden transition-opacity duration-300 ease-out ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white px-5 py-5">
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
        <p className="mt-0.5 text-[13px] text-white/85">
          近似读音：<span className="font-bold text-white">{entry.pron}</span>
        </p>
        <div className="mt-3">
          <SpeakButton text={entry.word} cacheKey={`fwod-${entry.word}`} label="法语播放" />
        </div>
      </div>

      {/* 释义图 */}
      <div className="relative w-full bg-rose-50 aspect-[4/3]">
        <Image
          src={wm(entry.image)}
          alt={entry.zh}
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-contain p-2"
          priority={false}
          unoptimized
          draggable={false}
        />
        {wmDownload(entry.image) && wmDownload(entry.image) !== wm(entry.image) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wmDownload(entry.image)}
            alt=""
            aria-hidden
            tabIndex={-1}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 w-full h-full opacity-0 select-none"
          />
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        <Block title="用法小贴士" body={entry.tip} />
        <div>
          <p className="text-[11px] text-rose-500 font-semibold tracking-wider uppercase mb-1.5">
            例句
          </p>
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 space-y-2">
            <p className="text-sm text-gray-900 font-medium leading-snug">
              {entry.example}
            </p>
            <p className="text-xs text-gray-600 leading-snug">{entry.exampleZh}</p>
            <SpeakButton text={entry.example} cacheKey={`fwod-ex-${entry.word}`} label="法语播放" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 text-amber-800 p-3">
      <p className="text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-1">
        {title}
      </p>
      <p className="text-sm leading-snug">{body}</p>
    </div>
  );
}

function WordListSheet({
  entries,
  currentIndex,
  learned,
  todayIdx,
  onClose,
  onPick,
}: {
  entries: FrenchDailyEntry[];
  currentIndex: number;
  learned: Record<string, string>;
  todayIdx: number;
  onClose: () => void;
  onPick: (i: number) => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-rose-100 px-5 py-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">词库总览</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50"
          >
            关闭
          </button>
        </div>
        <ul className="divide-y divide-rose-50">
          {entries.map((e, i) => {
            const isLearned = !!learned[e.word];
            const isLocked = i > todayIdx;
            const isCurrent = i === currentIndex;
            return (
              <li key={e.word}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onPick(i)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left active:bg-rose-50 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    isCurrent ? "bg-rose-50/70" : ""
                  }`}
                >
                  <div className="w-8 text-xs font-bold text-gray-400 tabular-nums">
                    {(i + 1).toString().padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {e.word}
                      </span>
                      <span className="text-[11px] text-gray-500 truncate">{e.zh}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {formatDateHuman(e.date)}
                    </div>
                  </div>
                  {isLocked ? (
                    <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100">
                      未解锁
                    </span>
                  ) : isLearned ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded-full bg-emerald-100">
                      <Check size={10} strokeWidth={3} /> 已学
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-500 px-1.5 py-0.5 rounded-full bg-rose-50">
                      未学
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
