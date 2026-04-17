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
    <div className="h-[calc(100vh-120px)] bg-sky-50 flex items-center justify-center text-sky-400 text-sm">
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

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/public/approved")
        .then((r) => r.json())
        .then((d: { records?: RawSubmission[] }) => {
          if (cancelled) return;
          const records = d.records ?? [];
          const items = records
            .map((r, i) => submissionToBusiness(r, i))
            .filter((b): b is Business => !!b);
          setApprovedExtras(items);
        })
        .catch(() => {});
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allBusinesses = useMemo(
    () =>
      [...businesses, ...approvedExtras]
        .filter((b) => !b.hidden)
        .map((b) => {
          if (typeof b.lat === "number" && typeof b.lng === "number") return b;
          const [lat, lng] = coordsForArea(b.area, b.id);
          return { ...b, lat, lng };
        }),
    [approvedExtras]
  );

  const openBusiness = (id: number) => {
    router.push(`/?biz=${id}`);
  };

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="bg-gradient-to-br from-sky-400 via-sky-500 to-blue-500 text-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition"
            aria-label="返回首页"
          >
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-lg font-bold">金沙萨商家地图</h1>
            <p className="text-xs opacity-80">
              {allBusinesses.length} 个商家 · 点图钉看详情
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-4">
        <MapSection
          businesses={allBusinesses.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            subcategory: b.subcategory,
            area: b.area,
            mainService: b.mainService,
            image: b.image,
            lat: b.lat,
            lng: b.lng,
          }))}
          categories={categories.map((c) => ({
            key: c.key,
            label: c.label,
            color: c.color,
            emoji: c.emoji,
          }))}
          focusBusinessId={focusBusinessId}
          onOpenBusiness={openBusiness}
        />
      </div>
    </div>
  );
}
