"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Megaphone, Search, X } from "lucide-react";
import {
  type Business,
  type RawSubmission,
  businesses,
  categories,
  coordsForArea,
  submissionToBusiness,
} from "@/lib/businesses";
import { BusinessCard } from "@/components/BusinessCardUI";
import { wm } from "@/lib/watermark";

interface PurchaseHit {
  id: string;
  timestamp: string;
  itemName: string;
  description: string;
  area: string;
  contactPerson: string;
  quantity: string;
  budget: string;
  images: string[];
}

interface CategoryHit {
  key: string;
  label: string;
  emoji: string;
  color: string;
  matchedSub: string | null;
}

function parseGallery(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/|^\//.test(s))
    .slice(0, 3);
}

function formatBudget(d: Record<string, string>): string {
  const legacy = (d.budget ?? "").trim();
  if (legacy) return legacy;
  const lo = (d.budgetMin ?? "").trim();
  const hi = (d.budgetMax ?? "").trim();
  if (!lo && !hi) return "";
  if (lo && hi) return `${lo} – ${hi} USD`;
  return `${lo || hi} USD`;
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [records, setRecords] = useState<RawSubmission[]>([]);

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/approved")
      .then((r) => r.json())
      .then((d: { records?: RawSubmission[] }) => {
        if (cancelled) return;
        setRecords(d.records ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const approvedBusinesses = useMemo(() => {
    const items: Business[] = [];
    records.forEach((r, i) => {
      if ((r.type as string) === "luggage") return;
      const b = submissionToBusiness(r, i);
      if (b) items.push(b);
    });
    return items;
  }, [records]);

  const purchases = useMemo<PurchaseHit[]>(() => {
    return records
      .filter((r) => r.type === "purchase")
      .map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        itemName: (r.data.itemName ?? "").trim(),
        description: (r.data.description ?? "").trim(),
        area: (r.data.area ?? "").trim(),
        contactPerson: (r.data.contactPerson ?? "").trim(),
        quantity: (r.data.quantity ?? "").trim(),
        budget: formatBudget(r.data),
        images: parseGallery(r.data.galleryUrls ?? ""),
      }))
      .filter((p) => p.itemName)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [records]);

  const allBusinesses = useMemo(
    () =>
      [...businesses, ...approvedBusinesses]
        .filter((b) => !b.hidden)
        .map((b) => {
          if (typeof b.lat === "number" && typeof b.lng === "number") return b;
          const [lat, lng] = coordsForArea(b.area, b.id);
          return { ...b, lat, lng };
        }),
    [approvedBusinesses]
  );

  const q = query.trim().toLowerCase();

  const bizResults = useMemo(() => {
    if (!q) return [] as Business[];
    return allBusinesses
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
  }, [allBusinesses, q]);

  const purchaseResults = useMemo(() => {
    if (!q) return [] as PurchaseHit[];
    return purchases
      .filter((p) => {
        const hay = [p.itemName, p.description, p.area, p.contactPerson, p.quantity]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [purchases, q]);

  const categoryHits = useMemo<CategoryHit[]>(() => {
    if (!q) return [];
    const hits: CategoryHit[] = [];
    for (const c of categories) {
      const catMatch = c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q);
      const subMatch = c.sub.find((s) => s.toLowerCase().includes(q)) ?? null;
      if (catMatch || subMatch) {
        hits.push({
          key: c.key,
          label: c.label,
          emoji: c.emoji,
          color: c.color,
          matchedSub: subMatch,
        });
      }
    }
    return hits.slice(0, 6);
  }, [q]);

  const totalHits = bizResults.length + purchaseResults.length + categoryHits.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = query.trim();
    const url = v ? `/search?q=${encodeURIComponent(v)}` : "/search";
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
                placeholder="搜索商家 / 子分类 / 求购信息…"
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

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {q === "" ? (
          <p className="text-sm text-gray-500">输入关键词搜索商家、子分类或求购信息</p>
        ) : totalHits === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">没找到匹配「{query}」的结果</p>
            <p className="text-xs text-gray-400 mt-1">
              试试其他关键词，或{" "}
              <Link href="/requests" className="text-orange-600 font-semibold">
                去需求大厅发布求购
              </Link>
            </p>
          </div>
        ) : (
          <>
            {categoryHits.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  跳转到分类
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {categoryHits.map((c) => (
                    <Link
                      key={c.key}
                      href={`/?cat=${c.key}`}
                      className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-sky-200 shadow-sm active:scale-[0.98] transition"
                      style={{ borderLeft: `4px solid ${c.color}` }}
                    >
                      <span className="text-2xl leading-none">{c.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-800 truncate">
                          {c.label}
                        </div>
                        {c.matchedSub && (
                          <div className="text-[11px] text-gray-500 truncate">
                            含子类「{c.matchedSub}」
                          </div>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {purchaseResults.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                    <Megaphone size={13} /> 需求大厅 · {purchaseResults.length} 条求购
                  </h2>
                  <Link
                    href="/requests"
                    className="text-[11px] text-orange-600 font-semibold"
                  >
                    全部求购 →
                  </Link>
                </div>
                <ul className="space-y-2">
                  {purchaseResults.map((p) => (
                    <PurchaseHitCard key={p.id} p={p} />
                  ))}
                </ul>
              </section>
            )}

            {bizResults.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  商家 · {bizResults.length} 条
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bizResults.map((biz) => (
                    <BusinessCard key={biz.id} biz={biz} onOpen={openBiz} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PurchaseHitCard({ p }: { p: PurchaseHit }) {
  return (
    <li>
      <Link
        href="/requests"
        className="flex gap-3 p-3 rounded-2xl bg-white border border-orange-200 shadow-sm hover:border-orange-400 active:scale-[0.99] transition"
      >
        {p.images[0] ? (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-orange-50 shrink-0">
            <Image
              src={wm(p.images[0])}
              alt={p.itemName}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Megaphone size={22} className="text-orange-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900 truncate">
            求购：{p.itemName}
          </div>
          {p.description && (
            <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
              {p.description}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {p.quantity && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                {p.quantity}
              </span>
            )}
            {p.budget && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                预算 {p.budget}
              </span>
            )}
            {p.area && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {p.area}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sky-50" />}>
      <SearchInner />
    </Suspense>
  );
}
