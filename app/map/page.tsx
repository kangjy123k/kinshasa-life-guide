"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import {
  type Business,
  type RawSubmission,
  businesses,
  categories,
  coordsForArea,
  submissionToBusiness,
} from "@/lib/businesses";

const MapSection = dynamic(() => import("../MapSection"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sky-400 text-sm">
      地图加载中…
    </div>
  ),
});

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sky-50 flex items-center justify-center text-sky-400 text-sm">
          加载中…
        </div>
      }
    >
      <MapPageInner />
    </Suspense>
  );
}

function MapPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const focusId = params.get("focus");
  const focusBusinessId = focusId ? Number(focusId) : null;

  const [approvedExtras, setApprovedExtras] = useState<Business[]>([]);
  const [activeKey, setActiveKey] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/approved")
      .then((r) => r.json())
      .then((d: { records?: RawSubmission[] }) => {
        if (cancelled) return;
        const items = (d.records ?? [])
          .map((r, i) => submissionToBusiness(r, i))
          .filter((b): b is Business => !!b);
        setApprovedExtras(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const allBusinesses = useMemo(
    () =>
      [...businesses, ...approvedExtras]
        .filter((b) => !b.hidden)
        // 二手物品不上商家地图：地图只服务"找店铺"场景
        .filter((b) => b.category !== "secondhand")
        // 无门店的不上地图（用户表单填"无"，种子数据也可能写"无固定店面 — …"）
        .filter((b) => !/^\s*无/.test(b.hasStore ?? ""))
        .map((b) => {
          if (typeof b.lat === "number" && typeof b.lng === "number") return b;
          const [lat, lng] = coordsForArea(b.area, b.id);
          return { ...b, lat, lng };
        }),
    [approvedExtras]
  );

  const focused = useMemo(
    () => allBusinesses.find((b) => b.id === focusBusinessId) ?? null,
    [allBusinesses, focusBusinessId]
  );

  // 聚焦商家时切到"全部"以确保可见
  useEffect(() => {
    if (focused && activeKey !== "all" && activeKey !== focused.category) {
      setActiveKey("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    allBusinesses.forEach((b) => {
      c.all += 1;
      c[b.category] = (c[b.category] || 0) + 1;
    });
    return c;
  }, [allBusinesses]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.key !== "secondhand"),
    []
  );

  const mapBiz = allBusinesses.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    subcategory: b.subcategory,
    area: b.area,
    mainService: b.mainService,
    image: b.image,
    lat: b.lat,
    lng: b.lng,
  }));

  return (
    <div className="h-[100svh] w-screen flex overflow-hidden bg-sky-50">
      <div className="flex-1 relative min-w-0">
        <Link
          href="/"
          className="absolute top-3 left-3 z-[1000] w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-sky-600 active:bg-sky-50"
          aria-label="返回首页"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="absolute top-3 left-16 z-[1000] px-3 py-1.5 rounded-full bg-white/95 shadow-sm ring-1 ring-sky-100 text-xs font-semibold text-sky-700"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          {activeKey === "all" ? "全部" : visibleCategories.find((c) => c.key === activeKey)?.label ?? ""}
          <span className="ml-1 text-gray-400 font-normal">· {counts[activeKey] || 0} 家</span>
        </div>
        <MapSection
          businesses={mapBiz}
          activeKey={activeKey}
          categories={visibleCategories.map((c) => ({
            key: c.key,
            label: c.label,
            color: c.color,
            emoji: c.emoji,
          }))}
          focusBusinessId={focusBusinessId}
          onOpenBusiness={(id) => router.push(`/?biz=${id}`)}
        />
      </div>

      <aside
        className="w-[72px] md:w-24 shrink-0 bg-white border-l border-sky-100 overflow-y-auto overscroll-contain"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <CategoryItem
          label="全部"
          emoji="🗺️"
          color="#0ea5e9"
          count={counts.all || 0}
          active={activeKey === "all"}
          onClick={() => setActiveKey("all")}
        />
        {visibleCategories.map((c) => (
          <CategoryItem
            key={c.key}
            label={c.label}
            emoji={c.emoji}
            color={c.color}
            count={counts[c.key] || 0}
            active={activeKey === c.key}
            onClick={() => setActiveKey(c.key)}
          />
        ))}
      </aside>
    </div>
  );
}

function CategoryItem({
  label,
  emoji,
  color,
  count,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  color: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`筛选: ${label}`}
      aria-pressed={active}
      className={`w-full flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 border-l-2 transition-all ${
        active ? "bg-sky-50 border-l-sky-500" : "border-l-transparent active:bg-sky-50"
      }`}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm"
        style={{
          background: active ? color : `${color}22`,
          color: active ? "#fff" : color,
        }}
      >
        {emoji}
      </span>
      <span className={`text-[10px] leading-tight font-semibold mt-0.5 ${active ? "text-sky-700" : "text-gray-700"}`}>
        {label}
      </span>
      <span className="text-[9px] text-gray-400 leading-none">{count}</span>
    </button>
  );
}
