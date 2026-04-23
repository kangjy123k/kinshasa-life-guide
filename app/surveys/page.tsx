"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Gift, Sparkles } from "lucide-react";
import { SURVEYS } from "@/lib/surveys";

export default function SurveysHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/useful"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-amber-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-400 rounded-full" />
            <h1 className="text-base font-bold text-gray-800">参与调研</h1>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
              <Gift size={10} /> 奖品多多
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <div className="space-y-3">
          {SURVEYS.map((s) => (
            <Link
              key={s.key}
              href={`/surveys/${s.key}`}
              className="block rounded-3xl overflow-hidden border border-amber-100 bg-white shadow-sm active:scale-[0.99] transition"
            >
              <div
                className={`bg-gradient-to-br ${s.color} text-white px-5 py-4 flex items-center gap-3 relative overflow-hidden`}
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15" />
                <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/10" />
                <span className="text-4xl shrink-0 drop-shadow relative">{s.emoji}</span>
                <div className="min-w-0 relative">
                  <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                    调研 · {s.sponsor}
                  </p>
                  <h2 className="text-lg font-black leading-tight drop-shadow truncate">
                    {s.title}
                  </h2>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-sm text-gray-700 leading-snug">{s.summary}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">
                    <Sparkles size={11} fill="currentColor" /> {s.reward}
                  </span>
                  {s.deadline && (
                    <span className="text-[11px] text-gray-400">截止 {s.deadline}</span>
                  )}
                </div>
                <div className="pt-1 flex items-center justify-end text-sm text-amber-600 font-semibold">
                  去填写 <ChevronRight size={14} className="ml-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
