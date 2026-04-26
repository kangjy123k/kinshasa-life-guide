"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Share2, Check, Copy } from "lucide-react";

import {
  QUIZ_TITLE,
  QUIZ_TOTAL_SCORE,
  quizQuestions,
  tierForScore,
} from "@/lib/quiz";
import { getDeployVersion } from "@/lib/deploy-version";

function shuffleIndices(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let s = seed | 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(
    () => Array(quizQuestions.length).fill(null),
  );
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000) + 1);

  const total = quizQuestions.length;
  const isResult = step >= total;
  const current = isResult ? null : quizQuestions[step];

  const orders = useMemo(() => {
    return quizQuestions.map((_, qi) => shuffleIndices(3, seed + qi * 31 + 7));
  }, [seed]);

  const score = useMemo(() => {
    return picks.reduce<number>((sum, optIdx, qi) => {
      if (optIdx == null) return sum;
      return sum + quizQuestions[qi].options[optIdx].score;
    }, 0);
  }, [picks]);

  const tier = useMemo(() => tierForScore(score), [score]);

  const reset = () => {
    setStep(0);
    setPicks(Array(total).fill(null));
    setPickedIdx(null);
    setAnimating(false);
  };

  const onPick = (originalOptIdx: number) => {
    if (animating || !current) return;
    setPickedIdx(originalOptIdx);
    setPicks((prev) => {
      const next = prev.slice();
      next[step] = originalOptIdx;
      return next;
    });
    setAnimating(true);
    window.setTimeout(() => {
      setStep((s) => s + 1);
      setPickedIdx(null);
      setAnimating(false);
    }, 380);
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-amber-50 via-orange-50 to-white pb-16">
      <TopBar />
      <Hero />

      {!isResult && current && (
        <Question
          key={step}
          step={step}
          total={total}
          question={current.question}
          options={orders[step].map((origIdx) => ({
            origIdx,
            text: current.options[origIdx].text,
          }))}
          pickedIdx={pickedIdx}
          onPick={onPick}
        />
      )}

      {isResult && (
        <Result
          score={score}
          totalScore={QUIZ_TOTAL_SCORE}
          tier={tier}
          onReset={reset}
        />
      )}
    </main>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-amber-100">
      <div className="max-w-md mx-auto flex items-center gap-2 px-3 h-11">
        <Link
          href="/"
          aria-label="返回首页"
          className="w-8 h-8 -ml-1 rounded-full hover:bg-amber-50 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft size={18} className="text-gray-700" />
        </Link>
        <h1 className="text-[14px] font-bold text-gray-800 truncate">{QUIZ_TITLE}</h1>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="max-w-md mx-auto px-3 pt-3">
      <div className="relative overflow-hidden rounded-2xl shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/quiz-hero.webp"
          alt={QUIZ_TITLE}
          className="w-full h-auto block select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

function Question({
  step,
  total,
  question,
  options,
  pickedIdx,
  onPick,
}: {
  step: number;
  total: number;
  question: string;
  options: { origIdx: number; text: string }[];
  pickedIdx: number | null;
  onPick: (origIdx: number) => void;
}) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEnter(true), 16);
    return () => window.clearTimeout(t);
  }, []);

  const progress = ((step + 1) / total) * 100;

  return (
    <section
      className={`max-w-md mx-auto px-4 mt-5 transition-all duration-300 ease-out ${
        enter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-orange-600 mb-2">
        <span>第 {step + 1} / {total} 题</span>
        <div className="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-[16px] font-bold text-gray-900 leading-snug mb-4">
        {question}
      </h2>

      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const picked = pickedIdx === opt.origIdx;
          const dim = pickedIdx != null && !picked;
          return (
            <button
              key={`${step}-${opt.origIdx}`}
              type="button"
              onClick={() => onPick(opt.origIdx)}
              disabled={pickedIdx != null}
              className={`group w-full text-left px-3.5 py-3 rounded-xl border text-[13.5px] leading-relaxed transition-all duration-300 ${
                picked
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 border-orange-500 text-white shadow-md scale-[1.01]"
                  : dim
                    ? "bg-white border-amber-100 text-gray-400 opacity-60"
                    : "bg-white border-amber-200 text-gray-800 hover:border-orange-300 active:scale-[0.99]"
              }`}
              style={{
                opacity: enter ? (dim ? 0.6 : 1) : 0,
                transform: enter ? "translateY(0)" : "translateY(6px)",
                transitionDelay: `${80 + i * 70}ms`,
              }}
            >
              <span
                className={`inline-flex w-5 h-5 mr-2 rounded-full items-center justify-center text-[11px] font-bold ${
                  picked
                    ? "bg-white/30 text-white"
                    : "bg-amber-100 text-orange-600 group-hover:bg-amber-200"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Result({
  score,
  totalScore,
  tier,
  onReset,
}: {
  score: number;
  totalScore: number;
  tier: ReturnType<typeof tierForScore>;
  onReset: () => void;
}) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEnter(true), 16);
    return () => window.clearTimeout(t);
  }, []);

  const pct = Math.round((score / totalScore) * 100);

  return (
    <section
      className={`max-w-md mx-auto px-4 mt-6 transition-all duration-500 ease-out ${
        enter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div
        className={`rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br ${tier.accent}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none drop-shadow-sm">{tier.emoji}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold opacity-90">你的测评结果</p>
            <h2 className="text-[22px] font-black leading-tight">{tier.title}</h2>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] opacity-80">得分</p>
            <p className="text-[22px] font-black leading-none">{score}</p>
            <p className="text-[10px] opacity-80">/ {totalScore}</p>
          </div>
        </div>

        <div className="mt-3 h-2 bg-white/25 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: enter ? `${pct}%` : "0%" }}
          />
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed opacity-95">
          {tier.description}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-white border border-amber-200 text-orange-600 text-[13px] font-bold active:scale-95 transition"
        >
          <RotateCcw size={14} /> 再测一次
        </button>
        <ShareLinkButton tier={tier.title} score={score} totalScore={totalScore} />
      </div>

      <Link
        href="/"
        className="mt-3 block text-center text-[12px] font-semibold text-gray-500 hover:text-gray-700 active:scale-95 transition"
      >
        返回首页继续逛
      </Link>
    </section>
  );
}

function ShareLinkButton({
  tier,
  score,
  totalScore,
}: {
  tier: string;
  score: number;
  totalScore: number;
}) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const lastClick = useRef(0);

  const onClick = async () => {
    const now = Date.now();
    if (now - lastClick.current < 600) return;
    lastClick.current = now;
    if (typeof window === "undefined") return;
    const url = new URL("/quiz", window.location.origin);
    const v = await getDeployVersion();
    if (v) url.searchParams.set("v", v);
    const text = `我的"是否适合在刚果金工作"测评结果：${tier} (${score}/${totalScore})。来测测你属于哪一档 → ${url.toString()}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setState("done");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      /* 静默失败 */
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-bold active:scale-95 transition ${
        state === "done"
          ? "bg-emerald-500 text-white"
          : "bg-gray-900 text-white"
      }`}
    >
      {state === "done" ? (
        <>
          <Check size={14} /> 已复制，去粘贴
        </>
      ) : (
        <>
          <Share2 size={14} /> 分享给朋友
        </>
      )}
    </button>
  );
}
