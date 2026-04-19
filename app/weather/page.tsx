"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";

const WeatherStrip = dynamic(() => import("@/components/WeatherStrip"), {
  ssr: false,
});

const RainRadarMap = dynamic(() => import("@/components/RainRadarMap"), {
  ssr: false,
});

export default function WeatherPage() {
  return (
    <div className="min-h-screen bg-sky-50 pb-12">
      <header className="bg-gradient-to-br from-sky-400 via-sky-500 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition"
            aria-label="返回首页"
          >
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-lg font-bold">金沙萨天气</h1>
            <p className="text-xs opacity-80">24 小时预报 + 2 小时雨预警</p>
          </div>
        </div>
      </header>

      <WeatherStrip />

      <RainRadarMap />

      <section className="max-w-4xl mx-auto px-4 mt-4 text-[11px] text-gray-500 leading-relaxed">
        <div className="p-3 rounded-xl bg-white/70 border border-sky-100">
          <p className="font-medium text-gray-700 mb-1">判定依据</p>
          <p>
            「有雨」按世界气象组织（WMO 4677）天气代码判定：51-57 毛毛雨 ·
            61-67 雨 · 80-82 阵雨 · 95-99 雷阵雨。
          </p>
          <p className="mt-1.5">
            降水强度按 mm/h 分级：&lt; 2.5 小雨 · 2.5-7.5 中雨 · 7.5-50 大雨 ·
            &gt; 50 暴雨。
          </p>
          <p className="mt-1.5">
            2 小时短时雨预警优先使用 Tomorrow.io 雷达 + ML，模型回落 Open-Meteo。
          </p>
        </div>
      </section>
    </div>
  );
}
