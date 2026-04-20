"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import type { RawSubmission } from "@/lib/businesses";
import { SubmissionModal, type FormKey } from "@/components/SubmissionModal";

export interface BoardField {
  key: string;
  label: string;
  format?: (raw: Record<string, string>) => string;
}

interface Props {
  formKey: FormKey;
  type: string;
  title: string;
  emptyHint: string;
  accent: string; // tailwind gradient classes e.g. "from-rose-400 to-pink-500"
  bg: string; // page bg classes
  titleField: BoardField;
  fields: BoardField[];
}

function relative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "刚刚";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w} 周前`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} 个月前`;
  return `${Math.floor(d / 365)} 年前`;
}

export function GenericBoardPage({
  formKey,
  type,
  title,
  emptyHint,
  accent,
  bg,
  titleField,
  fields,
}: Props) {
  const [records, setRecords] = useState<RawSubmission[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/approved")
      .then((r) => r.json())
      .then((d: { records?: RawSubmission[] }) => {
        if (!cancelled) setRecords(d.records ?? []);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = (records ?? [])
    .filter((r) => r.type === type)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className={`min-h-screen ${bg}`}>
      <section className={`bg-gradient-to-r ${accent} text-white`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            aria-label="返回首页"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">{title}</h1>
            <p className="text-xs text-white/90">
              {records === null ? "加载中…" : `共 ${items.length} 条信息`}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-gray-800 text-xs font-bold shadow-sm active:scale-95 transition"
          >
            <Plus size={14} /> 发布
          </button>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {records === null ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-xs mt-2">加载中</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm mb-4">{emptyHint}</p>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-sm active:scale-95 transition"
            >
              <Plus size={16} /> 我来发布第一条
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((r) => {
              const tv = titleField.format
                ? titleField.format(r.data)
                : r.data[titleField.key] ?? "";
              return (
                <li
                  key={r.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm md:text-base font-bold text-gray-800 flex-1 min-w-0 break-words">
                      {tv || "—"}
                    </h3>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {relative(r.timestamp)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-xs text-gray-700">
                    {fields.map((f) => {
                      const v = f.format ? f.format(r.data) : r.data[f.key];
                      if (!v || !v.trim()) return null;
                      return (
                        <FieldRow key={f.key} label={f.label} value={v} />
                      );
                    })}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && <SubmissionModal formKey={formKey} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-400 font-medium shrink-0">{label}</dt>
      <dd className="text-gray-800 break-words whitespace-pre-wrap">{value}</dd>
    </>
  );
}

export function joinRange(data: Record<string, string>, name: string, suffix = "") {
  const lo = (data[`${name}Min`] ?? "").trim();
  const hi = (data[`${name}Max`] ?? "").trim();
  if (!lo && !hi) return "";
  if (lo && hi) return `${lo} – ${hi}${suffix}`;
  return `${lo || hi}${suffix}`;
}

export function joinContact(data: Record<string, string>, prefix = "contact") {
  const parts: string[] = [];
  const p = (data[`${prefix}_phone`] ?? "").trim();
  const w = (data[`${prefix}_whatsapp`] ?? "").trim();
  const wc = (data[`${prefix}_wechat`] ?? "").trim();
  const e = (data[`${prefix}_email`] ?? "").trim();
  if (p) parts.push(`电话 ${p}`);
  if (w) parts.push(`WA ${w}`);
  if (wc) parts.push(`微信 ${wc}`);
  if (e) parts.push(e);
  return parts.join(" · ");
}
