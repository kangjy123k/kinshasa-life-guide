"use client";

import { useMemo, useState } from "react";
import {
  Phone,
  MessageCircle,
  Plane,
  Package,
  Calendar,
  Flame,
  TrendingUp,
} from "lucide-react";
import { type RawSubmission } from "@/lib/businesses";

export type LuggageDir = "home" | "congo";
export interface LuggageRecord {
  id: string;
  direction: LuggageDir;
  name: string;
  phone: string;
  wechat: string;
  fromCity: string;
  toCity: string;
  departureDate: string;
  availableWeight: string;
  price: string;
  goodsType: string;
  restrictions: string;
  remark: string;
  timestamp: string;
}

export function rawToLuggage(r: RawSubmission): LuggageRecord | null {
  if (r.type !== "luggage") return null;
  const d = r.data || {};
  const dir = (d.direction ?? "").trim();
  const direction: LuggageDir = dir.includes("回国") || dir.startsWith("回") ? "home" : "congo";
  return {
    id: r.id,
    direction,
    name: d.name ?? "",
    phone: d.phone ?? "",
    wechat: d.wechat ?? "",
    fromCity: d.fromCity ?? "",
    toCity: d.toCity ?? "",
    departureDate: d.departureDate ?? "",
    availableWeight: d.availableWeight ?? "",
    price: d.price ?? "",
    goodsType: d.goodsType ?? "",
    restrictions: d.restrictions ?? "",
    remark: d.remark ?? "",
    timestamp: r.timestamp,
  };
}

export function LuggageBoard({
  records,
  onOpenForm,
}: {
  records: LuggageRecord[];
  onOpenForm: () => void;
}) {
  const [tab, setTab] = useState<LuggageDir>("home");

  const sorted = useMemo(() => {
    const now = Date.now();
    return [...records]
      .filter((r) => r.direction === tab)
      .sort((a, b) => {
        const ta = Date.parse(a.departureDate);
        const tb = Date.parse(b.departureDate);
        const va = Number.isFinite(ta) ? ta : Date.parse(a.timestamp);
        const vb = Number.isFinite(tb) ? tb : Date.parse(b.timestamp);
        const fa = va < now ? va + 1e13 : va;
        const fb = vb < now ? vb + 1e13 : vb;
        return fa - fb;
      });
  }, [records, tab]);

  const homeCount = records.filter((r) => r.direction === "home").length;
  const congoCount = records.filter((r) => r.direction === "congo").length;

  return (
    <section className="max-w-4xl mx-auto px-4 mt-4">
      <div className="relative rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white p-4 md:p-5">
        <div className="absolute -right-4 -bottom-4 opacity-20">
          <Plane size={120} />
        </div>
        <div className="relative flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center">
            <Package size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-black leading-snug">
              📦 顺风捎带 · 中刚往返
            </h2>
            <p className="font-handwriting text-base md:text-lg text-yellow-100 mt-0.5">
              出门不空行李 · 每公斤都能变现
            </p>
            <p className="text-xs md:text-sm text-white/90 mt-1.5 leading-snug">
              <Flame size={13} className="inline -mt-0.5" /> 每月 2 次回国？
              发一次接一次单 · 托运余额 = 零花钱
            </p>
          </div>
        </div>
        <button
          onClick={onOpenForm}
          className="relative mt-4 w-full md:w-auto md:inline-flex flex items-center justify-center gap-2 px-5 py-3 bg-white text-orange-600 text-sm font-bold rounded-xl shadow hover:shadow-lg hover:bg-orange-50 transition active:scale-95"
        >
          <TrendingUp size={16} />
          发布捎带 · 免费接单
          <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-semibold">💰 可盈利</span>
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setTab("home")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "home"
              ? "bg-red-400 text-white shadow"
              : "bg-white text-gray-600 border border-sky-100"
          }`}
        >
          🇨🇩→🇨🇳 回中国
          <span className={`px-1.5 rounded-full text-xs ${tab === "home" ? "bg-white/25" : "bg-sky-50 text-gray-500"}`}>
            {homeCount}
          </span>
        </button>
        <button
          onClick={() => setTab("congo")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "congo"
              ? "bg-sky-500 text-white shadow"
              : "bg-white text-gray-600 border border-sky-100"
          }`}
        >
          🇨🇳→🇨🇩 来刚果金
          <span className={`px-1.5 rounded-full text-xs ${tab === "congo" ? "bg-white/25" : "bg-sky-50 text-gray-500"}`}>
            {congoCount}
          </span>
        </button>
      </div>

      <div className="mt-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 py-8 text-center">
            <Package size={32} className="mx-auto text-orange-300 mb-2" />
            <p className="text-sm text-gray-500 mb-1">暂无捎带信息</p>
            <p className="text-xs text-gray-400 mb-3">
              第一个发布，抢占本方向曝光 · 排名置顶
            </p>
            <button
              onClick={onOpenForm}
              className="text-xs font-semibold text-orange-600 underline"
            >
              立即发布捎带 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((r) => (
              <LuggageCard key={r.id} rec={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LuggageCard({ rec }: { rec: LuggageRecord }) {
  const dirColor =
    rec.direction === "home"
      ? "from-red-400 to-rose-500"
      : "from-sky-500 to-blue-500";
  const dirLabel =
    rec.direction === "home" ? "🇨🇩 → 🇨🇳 回国" : "🇨🇳 → 🇨🇩 来刚";

  const depMs = Date.parse(rec.departureDate);
  const daysToGo = Number.isFinite(depMs)
    ? Math.ceil((depMs - Date.now()) / 86400_000)
    : null;
  const countdown =
    daysToGo === null
      ? ""
      : daysToGo > 0
        ? `距出发 ${daysToGo} 天`
        : daysToGo === 0
          ? "今天出发"
          : `已出发 ${-daysToGo} 天`;

  const hasPhone = !!rec.phone.trim();
  const hasWechat = !!rec.wechat.trim();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden active:scale-[0.99] transition">
      <div className={`bg-gradient-to-r ${dirColor} px-4 py-2.5 text-white flex items-center justify-between`}>
        <span className="text-sm font-bold">{dirLabel}</span>
        <span className="text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
          <Calendar size={11} />
          {rec.departureDate || "日期待定"}
          {countdown && <span className="opacity-80">· {countdown}</span>}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="truncate">{rec.fromCity || "—"}</span>
          <Plane size={16} className="text-orange-400 shrink-0" />
          <span className="truncate">{rec.toCity || "—"}</span>
        </div>

        <div className="flex items-stretch gap-2">
          <div className="flex-1 rounded-xl bg-orange-50 border border-orange-100 p-2.5">
            <p className="text-[10px] text-orange-500 font-medium">可带重量</p>
            <p className="text-lg font-black text-orange-600 leading-tight">
              {rec.availableWeight ? `${rec.availableWeight} kg` : "—"}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-yellow-50 border border-yellow-100 p-2.5">
            <p className="text-[10px] text-yellow-700 font-medium">💰 报价</p>
            <p className="text-sm font-bold text-yellow-800 leading-tight break-words">
              {rec.price?.trim() || "面议"}
            </p>
          </div>
        </div>

        {rec.goodsType && (
          <div className="text-xs text-gray-600 bg-sky-50 rounded-lg px-2.5 py-1.5">
            <span className="text-sky-500 font-semibold">可带：</span>
            <span className="break-words">{rec.goodsType}</span>
          </div>
        )}
        {rec.restrictions && (
          <div className="text-xs text-gray-500 break-words">
            <span className="text-red-400 font-semibold">禁带：</span>
            {rec.restrictions}
          </div>
        )}
        {rec.remark && (
          <p className="text-xs text-gray-500 break-words">{rec.remark}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-gray-500 truncate">
            👤 <span className="font-medium text-gray-700">{rec.name || "匿名"}</span>
          </p>
          <div className="flex gap-2 shrink-0">
            {hasPhone && (
              <a
                href={`https://wa.me/${rec.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-red-400 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
              >
                <Phone size={12} /> WhatsApp
              </a>
            )}
            {hasWechat && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rec.wechat);
                  alert(`已复制微信号：${rec.wechat}`);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg"
              >
                <MessageCircle size={12} /> 微信
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
