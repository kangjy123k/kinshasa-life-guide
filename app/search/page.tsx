"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";
import {
  type Business,
  type RawSubmission,
  businesses,
  categories,
  coordsForArea,
  submissionToBusiness,
} from "@/lib/businesses";
import { BusinessCard } from "@/components/BusinessCardUI";

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [extras, setExtras] = useState<Business[]>([]);

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/approved")
      .then((r) => r.json())
      .then((d: { records?: RawSubmission[] }) => {
        if (cancelled) return;
        const items: Business[] = [];
        (d.records ?? []).forEach((r, i) => {
          if (r.type === "luggage") return;
          const b = submissionToBusiness(r, i);
          if (b) items.push(b);
        });
        setExtras(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const all = useMemo(
    () =>
      [...businesses, ...extras]
        .filter((b) => !b.hidden)
        .map((b) => {
          if (typeof b.lat === "number" && typeof b.lng === "number") return b;
          const [lat, lng] = coordsForArea(b.area, b.id);
          return { ...b, lat, lng };
        }),
    [extras]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Business[];
    return all
      .filter((b) => {
        const catLabel = categories.find((c) => c.key === b.category)?.label ?? "";
        return (
          b.name.toLowerCase().includes(q) ||
          b.mainService.toLowerCase().includes(q) ||
          b.area.toLowerCase().includes(q) ||
          b.intro.toLowerCase().includes(q) ||
          (b.subcategory ?? "").toLowerCase().includes(q) ||
          catLabel.toLowerCase().includes(q)
        );
      })
      .slice(0, 80);
  }, [all, query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    router.replace(url);
  };

  const openBiz = (id: number) => {
    router.push(`/?biz=${id}`);
  };

  return (
    <div className="min-h-screen bg-sky-50">
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0"
            aria-label="返回首页"
          >
            <ArrowLeft size={18} />
          </Link>
          <form onSubmit={submit} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 bg-white/95 rounded-full px-3 py-2">
              <Search size={16} className="text-sky-500 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 focus:outline-none"
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
          </form>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {query.trim() === "" ? (
          <p className="text-sm text-gray-500">输入关键词开始搜索</p>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">没找到匹配「{query}」的结果</p>
            <p className="text-xs text-gray-400 mt-1">换个关键词试试</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              共找到 {results.length} 条匹配「{query}」
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((biz) => (
                <BusinessCard key={biz.id} biz={biz} onOpen={openBiz} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sky-50" />}>
      <SearchInner />
    </Suspense>
  );
}
