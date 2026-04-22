"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { EVENTS, upcomingEvents, type OfflineEvent } from "@/lib/events";

function formatDateLabel(iso: string): { main: string; week: string } {
  try {
    const d = new Date(iso + "T12:00:00");
    const main = d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
    const week = d.toLocaleDateString("zh-CN", { weekday: "short" });
    return { main, week };
  } catch {
    return { main: iso, week: "" };
  }
}

function daysUntil(iso: string): number {
  const d = new Date(iso + "T12:00:00").getTime();
  const now = Date.now();
  return Math.ceil((d - now) / 86400_000);
}

export default function EventsPage() {
  const upcoming = upcomingEvents();
  const past = EVENTS.filter((e) => !upcoming.find((u) => u.id === e.id))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-sky-50 to-white pb-20">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-violet-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/useful"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-violet-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-violet-400 rounded-full" />
            <h1 className="text-base font-bold text-gray-800">线下活动</h1>
            <span className="text-[11px] text-gray-500">在刚果金也有丰富生活</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {upcoming.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-violet-200 text-sm text-gray-500">
            暂无即将到来的活动，欢迎自荐 / 联系平台上刊
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-gray-500 tracking-widest px-1">
              即将到来
            </h2>
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 tracking-widest px-1">已结束</h2>
            {past.map((e) => (
              <EventCard key={e.id} event={e} muted />
            ))}
          </section>
        )}

        <section className="rounded-2xl bg-violet-50 border border-violet-100 p-4 mt-4">
          <p className="text-[11px] text-violet-700 leading-relaxed">
            💡 有聚会、演出、赛事想让更多华人朋友看到？
            <br />
            联系平台运营把活动加进来，免费展示。
          </p>
        </section>
      </main>
    </div>
  );
}

function EventCard({ event, muted }: { event: OfflineEvent; muted?: boolean }) {
  const dt = formatDateLabel(event.date);
  const days = daysUntil(event.date);
  const soon = !muted && days >= 0 && days <= 7;

  return (
    <Link
      href={`/events/${event.id}`}
      className={`block rounded-3xl overflow-hidden border shadow-sm bg-white active:scale-[0.99] transition ${
        muted ? "opacity-70 border-gray-200" : "border-violet-100"
      }`}
    >
      <div className="flex">
        <div
          className={`w-20 shrink-0 flex flex-col items-center justify-center py-3 ${
            muted
              ? "bg-gray-100 text-gray-500"
              : "bg-gradient-to-br from-violet-500 to-sky-500 text-white"
          }`}
        >
          <p className="text-[10px] font-semibold opacity-80">{dt.week}</p>
          <p className="text-xl font-black leading-none mt-0.5">{dt.main}</p>
          <p className="text-[10px] opacity-80 mt-0.5">{event.date.slice(0, 4)}</p>
        </div>
        <div className="flex-1 min-w-0 px-4 py-3 relative">
          {event.featured && !muted && (
            <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-400 text-white rounded-full text-[10px] font-black">
              <Sparkles size={10} fill="currentColor" /> 推荐
            </span>
          )}
          {soon && (
            <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black">
              {days === 0 ? "今日" : `${days}天后`}
            </span>
          )}
          <h3 className="text-sm font-bold text-gray-900 leading-snug pr-14 line-clamp-2">
            {event.title}
          </h3>
          {event.tagline && (
            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{event.tagline}</p>
          )}
          <div className="mt-2 space-y-1 text-[11px] text-gray-600">
            <p className="flex items-center gap-1.5">
              <CalendarDays size={12} className="text-violet-500 shrink-0" />
              {event.timeHint ?? event.date}
            </p>
            <p className="flex items-start gap-1.5">
              <MapPin size={12} className="text-rose-400 mt-0.5 shrink-0" />
              <span className="line-clamp-1">{event.venue} · {event.area}</span>
            </p>
          </div>
          <div className="mt-2 flex items-center justify-end text-xs text-violet-600 font-semibold">
            查看详情 <ChevronRight size={12} className="ml-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
