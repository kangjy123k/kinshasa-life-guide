"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  ExternalLink,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { getEvent } from "@/lib/events";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = getEvent(id);
  if (!event) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-sky-50 to-white pb-20">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-violet-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/events"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-violet-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold text-gray-800 truncate">{event.title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {event.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.poster}
            alt={event.title}
            className="w-full rounded-3xl object-cover max-h-72 border border-violet-100"
          />
        )}

        <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-500 to-sky-500 text-white px-5 py-5 relative">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/10" />
          {event.featured && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-300 text-violet-900 rounded-full text-[10px] font-black mb-2 relative">
              <Sparkles size={10} fill="currentColor" /> 推荐活动
            </span>
          )}
          <h2 className="text-xl font-black leading-tight drop-shadow relative">{event.title}</h2>
          {event.tagline && (
            <p className="text-xs text-white/90 mt-1 leading-snug relative">{event.tagline}</p>
          )}
          <p className="mt-2 text-[11px] text-white/85 relative">
            主办：{event.organizer}
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-violet-100 p-4 space-y-3">
          <InfoRow icon={<CalendarDays size={15} className="text-violet-500" />}
                   label="时间"
                   text={`${event.date}${event.timeHint ? ` · ${event.timeHint}` : ""}`} />
          <InfoRow icon={<MapPin size={15} className="text-rose-400" />}
                   label="地点"
                   text={`${event.venue} · ${event.area}`} />
          {event.feeHint && (
            <InfoRow icon={<Ticket size={15} className="text-amber-500" />}
                     label="费用"
                     text={event.feeHint} />
          )}
          <InfoRow icon={<Users size={15} className="text-sky-500" />}
                   label="主办"
                   text={event.organizer} />
        </section>

        <section className="bg-white rounded-2xl border border-violet-100 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-1.5">
            活动介绍
          </p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
          {event.tags && event.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[11px] font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </section>

        {(event.contactPhone || event.contactWechat || event.externalUrl) && (
          <section className="bg-white rounded-2xl border border-violet-100 p-4 space-y-2">
            <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              报名 / 联系
            </p>
            <div className="flex flex-wrap gap-2">
              {event.contactPhone && (
                <a
                  href={`https://wa.me/${event.contactPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold active:scale-95 transition"
                >
                  <Phone size={12} /> WhatsApp {event.contactPhone}
                </a>
              )}
              {event.contactWechat && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(event.contactWechat!);
                    alert(`已复制微信号：${event.contactWechat}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold active:scale-95 transition"
                >
                  <MessageCircle size={12} /> 复制微信 {event.contactWechat}
                </button>
              )}
              {event.externalUrl && (
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold active:scale-95 transition"
                >
                  <ExternalLink size={12} /> 活动官网
                </a>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          {label}
        </p>
        <p className="leading-snug">{text}</p>
      </div>
    </div>
  );
}
