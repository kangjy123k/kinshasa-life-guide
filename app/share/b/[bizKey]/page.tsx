import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Store } from "lucide-react";
import { getSubmission } from "@/lib/submissions";
import {
  seedBusinesses,
  submissionToBusiness,
  type Business,
  categories,
} from "@/lib/businesses";
import ShareGuideOverlay from "./ShareGuideOverlay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  bizKey: string;
}

async function loadBiz(key: string): Promise<Business | null> {
  if (key.startsWith("seed-")) {
    const id = Number(key.slice(5));
    if (!Number.isFinite(id)) return null;
    return seedBusinesses.find((b) => b.id === id && !b.hidden) ?? null;
  }
  // 当成 submissionId 去 DB 查
  const rec = await getSubmission(key);
  if (!rec || rec.type !== "merchant" || rec.status !== "approved") return null;
  // submissionToBusiness 第二参数是 idx 用于生成 id；分享页不关心 id，
  // 给个占位（超过 seed id 上限避免误撞）
  const biz = submissionToBusiness(rec, 0);
  return biz ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const p = await params;
  const biz = await loadBiz(p.bizKey);
  if (!biz) {
    return { title: "商家不存在 · 刚果金华人生活服务指南" };
  }
  const title = biz.name;
  const description = "刚果金华人生活服务指南";
  const img = biz.image || null;
  const shareBase = new URL("https://share.blackstream.site");
  return {
    metadataBase: shareBase,
    title: `${title} · 刚果金华人生活服务指南`,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      siteName: "刚果金华人生活服务指南",
      ...(img ? { images: [{ url: img }] } : {}),
    },
    twitter: {
      card: img ? "summary_large_image" : "summary",
      title,
      description,
      ...(img ? { images: [img] } : {}),
    },
  };
}

export default async function ShareBizPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = await searchParams;
  const biz = await loadBiz(p.bizKey);
  if (!biz) return notFound();
  const cat = categories.find((c) => c.key === biz.category);
  const rawG = sp?.g;
  const guideMode =
    rawG === "chat" || rawG === "moments" ? (rawG as "chat" | "moments") : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="text-center mb-5">
          <p className="text-[11px] tracking-[0.3em] text-sky-500 font-semibold">
            商家 · MERCHANT
          </p>
          <h1 className="mt-2 text-2xl font-black text-gray-900 leading-tight">
            {biz.name}
          </h1>
          {cat && (
            <p className="mt-1 text-xs text-gray-500">
              {cat.label}
              {biz.subcategory ? ` · ${biz.subcategory}` : ""} · {biz.area}
            </p>
          )}
        </div>

        {biz.image && (
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-sky-100 mb-5 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={biz.image}
              alt={biz.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 mb-5 space-y-2.5">
          {biz.address && (
            <div className="flex gap-2 text-sm">
              <MapPin size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-gray-700 leading-snug">{biz.address}</p>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <Store size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <p className="text-gray-700 leading-snug">{biz.mainService}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-gray-700 leading-snug">所在区域：{biz.area}</p>
          </div>
        </div>

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-1 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white text-sm font-bold rounded-2xl shadow-md active:opacity-80"
        >
          进入【刚果金华人生活服务指南】
          <ArrowRight size={15} />
        </Link>

        <p className="mt-5 text-center text-[11px] text-gray-400 leading-relaxed">
          帮助刚果金华人更快找到本地服务<br />
          商家免费入驻 · 随便逛逛有惊喜
        </p>
      </div>

      {guideMode && (
        <ShareGuideOverlay type={guideMode} shareTitle={biz.name} />
      )}
    </div>
  );
}
