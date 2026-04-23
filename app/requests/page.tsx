"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Megaphone,
  MapPin,
  Clock,
  Wallet,
  Package,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from "lucide-react";

import type { RawSubmission } from "@/lib/businesses";
import { CallChip, CopyChip, WhatsAppChip } from "@/components/BusinessCardUI";
import { SubmissionModal } from "@/components/SubmissionModal";
import { wm } from "@/lib/watermark";

interface DemandCard {
  id: string;
  timestamp: string;
  itemName: string;
  quantity: string;
  budget: string;
  deadline: string;
  paymentMethod: string;
  area: string;
  description: string;
  contactPerson: string;
  phone: string;
  wechat: string;
  images: string[];
}

function formatBudget(data: Record<string, string>): string {
  const legacy = (data.budget ?? "").trim();
  if (legacy) return legacy;
  const lo = (data.budgetMin ?? "").trim();
  const hi = (data.budgetMax ?? "").trim();
  if (!lo && !hi) return "";
  if (lo && hi) return `${lo} – ${hi} USD`;
  return `${lo || hi} USD`;
}

function parseGallery(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/|^\//.test(s))
    .slice(0, 9);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "刚刚";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} 天前`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} 周前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

export default function RequestsPage() {
  const [records, setRecords] = useState<RawSubmission[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/approved")
      .then((r) => r.json())
      .then((d: { records?: RawSubmission[] }) => {
        if (cancelled) return;
        setRecords(d.records ?? []);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const demands: DemandCard[] = useMemo(() => {
    if (!records) return [];
    return records
      .filter((r) => r.type === "purchase")
      .map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        itemName: (r.data.itemName ?? "").trim(),
        quantity: (r.data.quantity ?? "").trim(),
        budget: formatBudget(r.data),
        deadline: (r.data.deadline ?? "").trim(),
        paymentMethod: (r.data.paymentMethod ?? "").trim(),
        area: (r.data.area ?? "").trim(),
        description: (r.data.description ?? "").trim(),
        contactPerson: (r.data.contactPerson ?? "").trim(),
        phone: (r.data.phone ?? "").trim(),
        wechat: (r.data.wechat ?? "").trim(),
        images: parseGallery(r.data.galleryUrls ?? ""),
      }))
      .filter((d) => d.itemName)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return demands;
    return demands.filter((d) => {
      const hay = [
        d.itemName,
        d.description,
        d.area,
        d.contactPerson,
        d.quantity,
        d.paymentMethod,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [demands, query]);

  return (
    <div className="min-h-screen bg-amber-50">
      <section className="bg-gradient-to-r from-orange-400 to-amber-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回首页"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Megaphone size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">需求大厅</h1>
            <p className="text-xs text-white/90">
              {records === null
                ? "加载中…"
                : query.trim()
                  ? `匹配「${query.trim()}」${filtered.length} 条`
                  : `共 ${demands.length} 条求购信息`}
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-orange-600 text-xs font-bold shadow-sm active:scale-95"
          >
            <Plus size={14} /> 发布
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-4">
          <div className="flex items-center gap-2 bg-white/95 rounded-full px-3 py-2 shadow-sm">
            <Search size={14} className="text-orange-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索求购信息：物品 / 区域 / 描述…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              inputMode="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清空"
                className="shrink-0"
              >
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {records === null ? (
          <div className="flex flex-col items-center justify-center py-16 text-orange-500">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-xs mt-2">加载中</p>
          </div>
        ) : demands.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone size={40} className="mx-auto text-orange-300 mb-3" />
            <p className="text-gray-500 text-sm mb-3">
              还没有求购信息。你可以成为第一个发布的人。
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm active:scale-95"
            >
              <Plus size={16} /> 我要求购
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">没有匹配「{query.trim()}」的求购信息</p>
            <p className="text-xs text-gray-400 mt-1">换个关键词试试</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((d) => (
              <DemandCardView key={d.id} d={d} />
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <SubmissionModal formKey="purchase" onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}

function DemandCardView({ d }: { d: DemandCard }) {
  const [contactsOpen, setContactsOpen] = useState(false);
  const hasPhone = !!d.phone;
  const hasWechat = !!d.wechat;
  const hasContact = hasPhone || hasWechat;

  return (
    <li className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900 leading-snug break-words">
            求购：{d.itemName}
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {d.contactPerson || "匿名"} · {relativeTime(d.timestamp)}
          </p>
        </div>
        {hasContact && (
          <button
            type="button"
            onClick={() => setContactsOpen((o) => !o)}
            className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 active:scale-95 transition"
            aria-expanded={contactsOpen}
          >
            {contactsOpen ? (
              <>
                收起 <ChevronUp size={11} />
              </>
            ) : (
              <>
                查看联系方式 <ChevronDown size={11} />
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.quantity && (
          <Chip icon={<Package size={11} />} text={d.quantity} tone="amber" />
        )}
        {d.budget && (
          <Chip icon={<Wallet size={11} />} text={`预算 ${d.budget}`} tone="rose" />
        )}
        {d.deadline && (
          <Chip icon={<Clock size={11} />} text={d.deadline} tone="sky" />
        )}
        {d.paymentMethod && (
          <Chip icon={<Wallet size={11} />} text={d.paymentMethod} tone="amber" />
        )}
        {d.area && (
          <Chip icon={<MapPin size={11} />} text={d.area} tone="emerald" />
        )}
      </div>

      {d.description && (
        <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {d.description}
        </p>
      )}

      {d.images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {d.images.map((src, i) => (
            <a
              key={`${d.id}-${i}`}
              href={wm(src)}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden rounded-lg bg-orange-50"
            >
              <Image
                src={wm(src)}
                alt={`${d.itemName} ${i + 1}`}
                fill
                sizes="(max-width: 768px) 33vw, 200px"
                className="object-cover"
                unoptimized
              />
            </a>
          ))}
        </div>
      )}

      {hasContact && contactsOpen && (
        <div className="mt-3 pt-3 border-t border-orange-100 space-y-3">
          {hasPhone && (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] text-gray-400 shrink-0">电话</span>
                <p className="flex-1 min-w-0 text-base font-semibold text-gray-900 break-all select-all">
                  {d.phone}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <CallChip phone={d.phone} />
                <WhatsAppChip phone={d.phone} />
              </div>
            </div>
          )}
          {hasWechat && (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] text-gray-400 shrink-0">微信号</span>
                <p className="flex-1 min-w-0 text-base font-semibold text-gray-900 break-all select-all">
                  {d.wechat}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <CopyChip text={d.wechat} label="复制微信号" doneLabel="已复制" />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Chip({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "amber" | "rose" | "sky" | "emerald";
}) {
  const bg = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${bg}`}
    >
      {icon}
      <span className="leading-none">{text}</span>
    </span>
  );
}
