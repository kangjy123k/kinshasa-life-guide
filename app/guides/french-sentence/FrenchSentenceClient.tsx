"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Flame,
  Repeat2,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SpeakButton } from "@/components/BusinessCardUI";
import { playLearnedChime, playMilestoneChime } from "@/lib/chime";
import {
  BANK,
  todayIndex,
  localDateString,
  type FrenchSentenceEntry,
  type TenseForms,
} from "@/lib/french-sentence-of-the-day";

const LS_KEY = "fsod-progress-v1";

interface Progress {
  learned: Record<string, string>; // date -> studiedOn
  streak: number;
  lastStudy: string | null;
  longestStreak: number;
}

function emptyProgress(): Progress {
  return { learned: {}, streak: 0, lastStudy: null, longestStreak: 0 };
}

function readProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      learned: parsed.learned ?? {},
      streak: parsed.streak ?? 0,
      lastStudy: parsed.lastStudy ?? null,
      longestStreak: parsed.longestStreak ?? 0,
    };
  } catch {
    return emptyProgress();
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
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400_000);
}

function formatDateHuman(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dt.getDay()];
  return `${m}月${day}日 ${weekday}`;
}

/** 把句子里出现的关键词加粗高亮（只标第一处） */
function renderHighlighted(sentence: string, highlight: string) {
  const idx = sentence.indexOf(highlight);
  if (idx < 0 || !highlight) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, idx)}
      <mark className="bg-yellow-300/90 text-gray-900 rounded px-1 font-black">
        {highlight}
      </mark>
      {sentence.slice(idx + highlight.length)}
    </>
  );
}

export default function FrenchSentenceClient() {
  const entries = BANK;
  const todayIdx = useMemo(() => todayIndex(entries), [entries]);
  const totalEntries = entries.length;

  const [index, setIndex] = useState(todayIdx);
  const userMovedRef = useRef(false);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [justLearned, setJustLearned] = useState(false);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showList, setShowList] = useState(false);
  const [listMode, setListMode] = useState<"all" | "learned">("all");

  const openList = useCallback((mode: "all" | "learned") => {
    setListMode(mode);
    setShowList(true);
  }, []);

  useEffect(() => {
    setProgress(readProgress());
  }, []);

  useEffect(() => {
    if (!userMovedRef.current) setIndex(todayIdx);
  }, [todayIdx]);

  const entry = entries[Math.min(index, entries.length - 1)];
  const isToday = index === todayIdx;
  const canForward = index < todayIdx;
  const canBackward = index > 0;
  const learnedCount = Object.keys(progress.learned).length;
  const alreadyLearned = !!progress.learned[entry.date];

  // 用户主动点「已学」才算学过 —— 带多邻国式音效反馈
  const handleMarkLearned = useCallback(() => {
    playLearnedChime();
    if (alreadyLearned) return; // 已学过：只补一声「叮」，不重复计数

    const today = localDateString();
    setProgress((prev) => {
      if (prev.learned[entry.date]) return prev;
      let { streak, longestStreak: longest, lastStudy } = prev;
      if (isToday) {
        if (lastStudy === today) {
          /* 今天已打过卡 */
        } else if (lastStudy && daysBetween(lastStudy, today) === 1) {
          streak += 1;
        } else {
          streak = 1;
        }
        lastStudy = today;
        if (streak > longest) longest = streak;
      }
      const next: Progress = {
        learned: { ...prev.learned, [entry.date]: today },
        streak,
        longestStreak: longest,
        lastStudy,
      };
      writeProgress(next);
      return next;
    });

    setJustLearned(true);
    window.setTimeout(() => setJustLearned(false), 1400);

    const ms = milestoneFor(learnedCount + 1, totalEntries);
    if (ms) {
      window.setTimeout(() => playMilestoneChime(), 260); // 让「叮叮」先响完
      setMilestone(ms);
      window.setTimeout(() => setMilestone(null), 2600);
    }
  }, [alreadyLearned, entry.date, isToday, learnedCount, totalEntries]);

  // 触摸滑动：右滑看更早，左滑往今天走
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
      `【每日法语一句 · ${formatDateHuman(entry.date)}】\n${entry.sentence}\n≈ ${entry.pron}\n${entry.zh}\n\n关键词：${entry.keyword}（${entry.keywordZh}）\n\n在"刚果金华人生活服务指南"里每天学一句，悄悄学，惊艳所有人。`,
    [entry],
  );

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "每日法语一句", text: shareText });
        return;
      } catch {
        /* 取消就回退复制 */
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 剪贴板被拒也不报错 */
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-sky-50 to-white pb-24"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-indigo-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/useful"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-indigo-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-1 h-5 bg-indigo-400 rounded-full shrink-0" />
            <h1 className="text-base font-bold text-gray-800 truncate">每日法语一句</h1>
          </div>
          <button
            type="button"
            onClick={() => openList("all")}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 active:scale-95 transition px-2 py-1 rounded-lg"
          >
            句库
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openList("learned")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[12px] font-semibold active:scale-95 transition"
            >
              <Sparkles size={13} />
              已学 {learnedCount} / {totalEntries} 句
              <ChevronRight size={13} className="opacity-60" />
            </button>
            {progress.streak > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-semibold">
                <Flame size={11} fill="currentColor" />
                {progress.streak} 天
              </div>
            )}
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
            className="w-9 h-9 rounded-full bg-white border border-indigo-200 text-gray-600 hover:bg-indigo-50 flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-700 font-semibold">
              {formatDateHuman(entry.date)}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {isToday && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold">
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
            className="w-9 h-9 rounded-full bg-white border border-indigo-200 text-gray-600 hover:bg-indigo-50 flex items-center justify-center active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <SentenceCard
          key={entry.date}
          entry={entry}
          learned={alreadyLearned}
          onMarkLearned={handleMarkLearned}
        />

        {/* 分享 */}
        <div className="mt-4">
          <button
            type="button"
            onClick={share}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-sm font-semibold shadow-sm active:scale-95 transition"
          >
            <Share2 size={15} />
            {copied ? "已复制到剪贴板" : "分享到群里"}
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400 leading-relaxed">
          左右滑动切换日期，每天一句，坚持就是学法语。
          <br />
          悄悄学，惊艳所有人。
        </p>
      </main>

      {justLearned && (
        <div className="fixed inset-x-0 top-24 z-30 flex justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg animate-slide-in">
            <Check size={14} className="inline -mt-0.5 mr-1" strokeWidth={3} /> 学过一句啦！
          </div>
        </div>
      )}

      {milestone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
          <div className="bg-gradient-to-br from-indigo-500 to-sky-500 text-white px-8 py-6 rounded-3xl shadow-2xl text-center animate-slide-in">
            <Trophy size={40} fill="currentColor" className="mx-auto mb-2 drop-shadow" />
            <p className="text-lg font-bold">{milestone}</p>
          </div>
        </div>
      )}

      {showList && (
        <SentenceListSheet
          entries={entries}
          currentIndex={index}
          learned={progress.learned}
          todayIdx={todayIdx}
          initialFilter={listMode}
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
  if (learned === total && total > 0) return `${total} 句全部拿下，恭喜出师！`;
  if (learned > 0 && learned % 10 === 0) return `已经学了 ${learned} 句，太猛了！`;
  if (learned > 0 && learned % 5 === 0) return `已经学了 ${learned} 句，继续加油！`;
  return null;
}

const PERSON_LABELS: Array<{ key: keyof TenseForms; label: string }> = [
  { key: "je", label: "je" },
  { key: "tu", label: "tu" },
  { key: "il", label: "il·elle" },
  { key: "nous", label: "nous" },
  { key: "vous", label: "vous" },
  { key: "ils", label: "ils·elles" },
];

const TENSES: Array<{ key: keyof FrenchSentenceEntry["conj"]; label: string }> = [
  { key: "present", label: "现在时" },
  { key: "passeCompose", label: "复合过去时" },
  { key: "imparfait", label: "未完成过去时" },
  { key: "futur", label: "简单将来时" },
];

function SentenceCard({
  entry,
  learned,
  onMarkLearned,
}: {
  entry: FrenchSentenceEntry;
  learned: boolean;
  onMarkLearned: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`bg-white rounded-3xl shadow-md border border-indigo-100 overflow-hidden transition-opacity duration-300 ease-out ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 句子头 */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 text-white px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          Phrase du jour
        </p>
        <p className="mt-2 text-[22px] md:text-2xl font-black leading-snug drop-shadow">
          {renderHighlighted(entry.sentence, entry.highlight)}
        </p>
        <p className="mt-2 text-[13px] text-white/85">
          近似读音：<span className="font-bold text-white">{entry.pron}</span>
        </p>
        <p className="mt-1 text-base font-semibold text-white drop-shadow-sm">{entry.zh}</p>
        <div className="mt-3">
          <SpeakButton
            text={entry.sentence}
            cacheKey={`fsod-${entry.date}`}
            label="法语播放整句"
          />
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* 关键词讲解 */}
        <section>
          <SectionLabel>关键词讲解</SectionLabel>
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-indigo-700">{entry.keyword}</span>
              <span className="text-[11px] text-gray-500">{entry.pos}</span>
              <span className="text-sm font-semibold text-gray-800">= {entry.keywordZh}</span>
              <SpeakButton
                text={entry.keyword}
                cacheKey={`fsod-kw-${entry.date}`}
                label="读"
              />
            </div>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{entry.keywordUsage}</p>
          </div>
        </section>

        {/* 已学打卡按钮 —— 点一下有音效反馈（多邻国式） */}
        <button
          type="button"
          onClick={onMarkLearned}
          aria-pressed={learned}
          className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold shadow-sm active:scale-[0.97] transition ${
            learned
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
          }`}
        >
          <CheckCircle2 size={18} strokeWidth={2.5} />
          {learned ? "已学会 · 再听一次 🔔" : "我学会了这句 ✓"}
        </button>

        {/* 四时态变位 */}
        <section>
          <SectionLabel>关键词动词变位</SectionLabel>
          <div className="rounded-2xl border border-amber-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] border-collapse min-w-[420px]">
                <thead>
                  <tr className="bg-amber-100/70 text-amber-900">
                    <th className="text-left font-bold px-2.5 py-2 sticky left-0 bg-amber-100/70">
                      人称
                    </th>
                    {TENSES.map((t) => (
                      <th key={t.key} className="text-left font-bold px-2.5 py-2 whitespace-nowrap">
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERSON_LABELS.map((p, ri) => (
                    <tr key={p.key} className={ri % 2 ? "bg-amber-50/40" : "bg-white"}>
                      <td className="px-2.5 py-1.5 font-semibold text-gray-500 sticky left-0 bg-inherit whitespace-nowrap">
                        {p.label}
                      </td>
                      {TENSES.map((t) => (
                        <td key={t.key} className="px-2.5 py-1.5 text-gray-800 whitespace-nowrap">
                          {entry.conj[t.key][p.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">表格可左右滑动查看四种时态</p>
        </section>

        {/* 两个额外变位例句 */}
        <section>
          <SectionLabel>换个变位再练两句</SectionLabel>
          <div className="space-y-2.5">
            {entry.extras.map((ex, i) => (
              <div
                key={i}
                className="rounded-2xl bg-sky-50 border border-sky-100 p-3.5 space-y-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-full">
                    {ex.tense}
                  </span>
                  <SpeakButton
                    text={ex.fr}
                    cacheKey={`fsod-ex-${entry.date}-${i}`}
                    label="读"
                  />
                </div>
                <p className="text-sm text-gray-900 font-semibold leading-snug">{ex.fr}</p>
                <p className="text-xs text-gray-600 leading-snug">{ex.zh}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{ex.usage}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 重复整句收尾 */}
        <section>
          <div className="rounded-2xl bg-indigo-600 text-white p-4">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-white/70 mb-1.5 flex items-center gap-1">
              <Repeat2 size={13} /> 再读一遍整句
            </p>
            <p className="text-lg font-black leading-snug drop-shadow">
              {renderHighlighted(entry.sentence, entry.highlight)}
            </p>
            <p className="mt-1 text-sm text-white/85">{entry.zh}</p>
            <div className="mt-3">
              <SpeakButton
                text={entry.sentence}
                cacheKey={`fsod-${entry.date}`}
                label="法语播放整句"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-indigo-500 font-semibold tracking-wider uppercase mb-1.5">
      {children}
    </p>
  );
}

function SentenceListSheet({
  entries,
  currentIndex,
  learned,
  todayIdx,
  initialFilter,
  onClose,
  onPick,
}: {
  entries: FrenchSentenceEntry[];
  currentIndex: number;
  learned: Record<string, string>;
  todayIdx: number;
  initialFilter: "all" | "learned";
  onClose: () => void;
  onPick: (i: number) => void;
}) {
  const [shown, setShown] = useState(false);
  const [filter, setFilter] = useState<"all" | "learned">(initialFilter);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const learnedCount = entries.filter((e) => learned[e.date]).length;
  const rows = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (filter === "learned" ? !!learned[e.date] : true));

  const tabCls = (active: boolean) =>
    `flex-1 text-center text-xs font-bold py-1.5 rounded-full transition ${
      active ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600"
    }`;

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
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-indigo-100 px-5 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800">
              {filter === "learned" ? "我已学会的" : "句库总览"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-indigo-600 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-50"
            >
              关闭
            </button>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-indigo-50">
            <button type="button" onClick={() => setFilter("all")} className={tabCls(filter === "all")}>
              全部 {entries.length}
            </button>
            <button
              type="button"
              onClick={() => setFilter("learned")}
              className={tabCls(filter === "learned")}
            >
              已学 {learnedCount}
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            还没有学会的句子，点每张卡片上的「我学会了这句」开始打卡吧。
          </div>
        ) : (
          <ul className="divide-y divide-indigo-50">
            {rows.map(({ e, i }) => {
              const isLearned = !!learned[e.date];
              const isLocked = i > todayIdx;
              const isCurrent = i === currentIndex;
              return (
                <li key={e.date}>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => onPick(i)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left active:bg-indigo-50 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      isCurrent ? "bg-indigo-50/70" : ""
                    }`}
                  >
                    <div className="w-8 text-xs font-bold text-gray-400 tabular-nums">
                      {(i + 1).toString().padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-indigo-700 shrink-0">
                          {e.keyword}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">{e.keywordZh}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {formatDateHuman(e.date)} · {e.sentence}
                      </div>
                    </div>
                    {isLocked ? (
                      <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100 shrink-0">
                        未解锁
                      </span>
                    ) : isLearned ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded-full bg-emerald-100 shrink-0">
                        <Check size={10} strokeWidth={3} /> 已学
                      </span>
                    ) : (
                      <span className="text-[10px] text-indigo-500 px-1.5 py-0.5 rounded-full bg-indigo-50 shrink-0">
                        未学
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
