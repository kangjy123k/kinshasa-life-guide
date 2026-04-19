"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type RawSubmission } from "@/lib/businesses";
import {
  LuggageBoard,
  type LuggageRecord,
  rawToLuggage,
} from "@/components/LuggageBoard";
import { SubmissionModal } from "@/components/SubmissionModal";

export default function LuggagePage() {
  const [records, setRecords] = useState<LuggageRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/public/approved")
        .then((r) => r.json())
        .then((d: { records?: RawSubmission[] }) => {
          if (cancelled) return;
          const items: LuggageRecord[] = [];
          (d.records ?? []).forEach((r) => {
            const lr = rawToLuggage(r);
            if (lr) items.push(lr);
          });
          setRecords(items);
        })
        .catch(() => {});
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-sky-50">
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">顺风捎带 · 中刚往返</h1>
            <p className="text-xs text-white/80">共 {records.length} 条信息</p>
          </div>
        </div>
      </section>

      <LuggageBoard records={records} onOpenForm={() => setFormOpen(true)} />

      <div className="h-8" />

      {formOpen && (
        <SubmissionModal formKey="luggage" onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}
