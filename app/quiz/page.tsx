"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, ImageDown, Loader2, X } from "lucide-react";

import {
  QUIZ_TITLE,
  QUIZ_TOTAL_SCORE,
  type QuizTier,
  quizQuestions,
  tierForScore,
} from "@/lib/quiz";

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
      {!isResult && <Hero />}

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
  tier: QuizTier;
  onReset: () => void;
}) {
  const [enter, setEnter] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEnter(true), 16);
    return () => window.clearTimeout(t);
  }, []);

  const pct = Math.round((score / totalScore) * 100);

  return (
    <section
      className={`max-w-md mx-auto px-3 mt-4 transition-all duration-500 ease-out ${
        enter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="relative overflow-hidden rounded-3xl shadow-xl">
        {/* tier 图作为背景 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tier.image}
          alt={tier.title}
          className="w-full h-auto block select-none"
          draggable={false}
        />
        {/* 顶部小标签 */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur text-[11px] font-bold text-gray-800 shadow-sm">
          你的测评结果
        </div>
        {/* 底部渐变 + 等级 + 分数 */}
        <div className="absolute inset-x-0 bottom-0 pt-16 pb-4 px-4 bg-gradient-to-t from-black/85 via-black/55 to-transparent text-white">
          <div className="flex items-end gap-2.5">
            <span className="text-3xl leading-none drop-shadow">{tier.emoji}</span>
            <h2 className="text-[26px] font-black leading-none drop-shadow tracking-wide">
              {tier.title}
            </h2>
            <div className="ml-auto text-right leading-none">
              <span className="text-[28px] font-black drop-shadow">{score}</span>
              <span className="text-[12px] opacity-80"> / {totalScore}</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: enter ? `${pct}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 px-1">
        <p className="text-[14px] leading-relaxed text-gray-800">
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
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[13px] font-bold active:scale-95 transition shadow-md"
        >
          <ImageDown size={14} /> 生成分享图
        </button>
      </div>

      <Link
        href="/"
        className="mt-3 block text-center text-[12px] font-semibold text-gray-500 hover:text-gray-700 active:scale-95 transition"
      >
        返回首页继续逛
      </Link>

      {shareOpen && (
        <ShareCardSheet
          tier={tier}
          score={score}
          totalScore={totalScore}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** 文本换行 (CJK-friendly：按字符断行) */
function wrapTextCJK(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function buildShareCard(
  tier: QuizTier,
  score: number,
  totalScore: number,
): Promise<string> {
  const W = 1080;
  const H = 1620;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 底色
  ctx.fillStyle = "#fff7ed";
  ctx.fillRect(0, 0, W, H);

  // 等级背景图（top 0~1080 像 1:1 cover）
  try {
    const tierImg = await loadImage(tier.image);
    const targetH = 1080;
    // cover：保宽，按图片比例放高
    const ratio = tierImg.width / tierImg.height;
    let drawW = W;
    let drawH = drawW / ratio;
    if (drawH < targetH) {
      drawH = targetH;
      drawW = drawH * ratio;
    }
    const dx = (W - drawW) / 2;
    const dy = 0;
    ctx.drawImage(tierImg, dx, dy, drawW, drawH);
  } catch {
    // 图载失败：纯色降级
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(0, 0, W, 1080);
  }

  // 顶部「测评结果」胶囊
  const tagText = "测测你是否适合在刚果金工作";
  ctx.font = "600 30px 'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
  const tagW = ctx.measureText(tagText).width + 48;
  const tagH = 56;
  const tagX = (W - tagW) / 2;
  const tagY = 36;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, tagX, tagY, tagW, tagH, 28);
  ctx.fill();
  ctx.fillStyle = "#1f2937";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tagText, W / 2, tagY + tagH / 2 + 1);

  // 等级 + 分数浮层（在 1080 图底部）
  const overlayH = 240;
  const overlayY = 1080 - overlayH;
  const grad = ctx.createLinearGradient(0, overlayY, 0, 1080);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, overlayY, W, overlayH);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 96px 'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
  ctx.fillText(`${tier.emoji} ${tier.title}`, 60, 1010);

  ctx.textAlign = "right";
  ctx.font = "900 88px 'PingFang SC','Hiragino Sans GB',sans-serif";
  ctx.fillText(`${score}`, W - 60, 1010);
  ctx.font = "600 32px 'PingFang SC',sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const scoreLabelW = ctx.measureText(`/ ${totalScore}`).width;
  ctx.fillText(`/ ${totalScore}`, W - 60, 1050);
  // 把 / total 放在分数右下角
  void scoreLabelW;

  // 描述区（白底）1080~1380
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 1080, W, 540);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#1f2937";
  ctx.font = "500 36px 'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
  const descLines = wrapTextCJK(ctx, tier.description, W - 120);
  let y = 1120;
  for (const line of descLines.slice(0, 6)) {
    ctx.fillText(line, 60, y);
    y += 56;
  }

  // 底部 caption + 二维码
  const footerY = 1410;
  // 二维码
  try {
    const qr = await loadImage("/images/quiz/qr.png");
    const qrSize = 180;
    ctx.drawImage(qr, W - qrSize - 60, footerY, qrSize, qrSize);
  } catch {
    /* ignore */
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#9a3412";
  ctx.font = "900 44px 'PingFang SC','Hiragino Sans GB',sans-serif";
  ctx.fillText("@刚果金华人生活指南", 60, footerY + 70);

  ctx.fillStyle = "#6b7280";
  ctx.font = "500 26px 'PingFang SC',sans-serif";
  ctx.fillText("扫码进入小程序 · 商家免费入驻", 60, footerY + 130);

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function ShareCardSheet({
  tier,
  score,
  totalScore,
  onClose,
}: {
  tier: QuizTier;
  score: number;
  totalScore: number;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    buildShareCard(tier, score, totalScore)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tier, score, totalScore]);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      window.setTimeout(onClose, 240);
      return true;
    });
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="关闭"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur"
      >
        <X size={18} />
      </button>

      {dataUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={`${tier.title} - 测评结果`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[78vh] max-w-full w-auto rounded-xl shadow-2xl"
            draggable={false}
          />
          <p className="mt-3 text-white text-sm font-medium px-4 text-center leading-relaxed">
            长按图片 → 保存到相册 / 分享给朋友
          </p>
        </>
      ) : error ? (
        <div className="text-white text-sm">图片生成失败，请重试</div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">正在生成你的测评卡…</p>
        </div>
      )}
    </div>
  );
}
