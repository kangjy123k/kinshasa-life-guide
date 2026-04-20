"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { filterUseful, usefulItems } from "@/lib/useful-items";

export default function UsefulPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const matches = useMemo(() => (q.trim() ? filterUseful(q) : usefulItems), [q]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-16">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-sky-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-sky-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-sky-400 rounded-full" />
            <h1 className="text-base font-bold text-gray-800">实用信息</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索实用信息 (天气 / 地图 / 工地法语…)"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-sky-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="清空搜索"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 active:scale-95 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-10 bg-sky-50 rounded-2xl border border-dashed border-sky-200">
            没有匹配的实用信息
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {matches.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-sky-200 shadow-sm text-gray-800 active:scale-[0.98] hover:border-sky-400 hover:shadow transition"
              >
                <span className="text-3xl leading-none shrink-0">{it.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{it.title}</div>
                  <div className="text-xs text-gray-500 truncate">{it.desc}</div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-gray-400 shrink-0 group-hover:text-sky-500 transition"
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
