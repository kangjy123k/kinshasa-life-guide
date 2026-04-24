import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmission, type MerchantUpdate } from "@/lib/submissions";
import { ArrowRight } from "lucide-react";
import ShareGuideOverlay from "./ShareGuideOverlay";

export const runtime = "nodejs";
// Dynamic — 每次请求都拉最新数据
export const dynamic = "force-dynamic";

interface Params {
  submissionId: string;
  updateId: string;
}

function isValidImg(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("/api/media/");
}

async function loadData(params: Params) {
  const rec = await getSubmission(params.submissionId);
  if (!rec || rec.type !== "merchant" || rec.status !== "approved") return null;
  const bizName = rec.data?.nameZh || rec.data?.name || "商家";

  // 1) DB 里真实存的 updates
  let updates: MerchantUpdate[] = [];
  try {
    const raw = rec.data?.updates;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) updates = parsed;
    }
  } catch {
    /* ignore */
  }

  // 2) 前端合成的 "form-${id}" update (来自初始表单的 latestUpdateText /
  //    latestUpdateImages)。前端分享页若走 form-xxx，后端也要能找到它。
  const formId = `form-${rec.id}`;
  if (params.updateId === formId) {
    const latestText = (rec.data?.latestUpdateText || "").trim();
    const latestImgs = (rec.data?.latestUpdateImages || "")
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter((u) => isValidImg(u))
      .slice(0, 6);
    if (latestText || latestImgs.length > 0) {
      return {
        bizName,
        update: {
          id: formId,
          at: rec.timestamp || new Date().toISOString(),
          text: latestText,
          ...(latestImgs.length ? { images: latestImgs } : {}),
        } as MerchantUpdate,
      };
    }
  }

  const u = updates.find((x) => x.id === params.updateId);
  if (!u) return null;
  return { bizName, update: u };
}

function firstImage(u: MerchantUpdate): string | null {
  const img = u.images?.[0];
  return img || null;
}

/**
 * 把原始图片地址包一层 Next.js 图片优化器 —— 微信爬虫超时很短，
 * 原图(1600×1200, ~300KB) 慢；转成 640 宽度的 webp/jpg 后 ~30-60KB，
 * 边缘命中缓存只要 ms 级。
 */
function ogImageUrl(src: string, origin: string): string {
  // 已经是绝对 URL 直接拼；否则相对路径用 origin
  const abs = /^https?:\/\//i.test(src) ? src : `${origin}${src}`;
  const params = new URLSearchParams({
    url: abs,
    w: "640",
    q: "80",
  });
  return `${origin}/_next/image?${params.toString()}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const p = await params;
  const data = await loadData(p);
  if (!data) {
    return {
      title: "动态不存在 · 刚果金华人生活服务指南",
    };
  }
  const { bizName, update } = data;
  const title = update.title || `${bizName} · 最新动态`;
  // 副标题取详细内容前 28 字符（一行 14 × 两行）
  const textSnippet = (update.text || "").replace(/\s+/g, " ").slice(0, 28);
  const description = `${textSnippet ? textSnippet + " · " : ""}@【${bizName}】的最新活动 · 刚果金华人生活服务指南`;
  const img = firstImage(update);
  // 分享域名：OG 标签里所有 URL 都用这个域名（图片、页面自身），避免微信
  // 看到 *.vercel.app 的图片 URL 又降级。metadataBase 只影响本页的 OG。
  const shareBase = "https://share.blackstream.site";
  const ogImg = img ? ogImageUrl(img, shareBase) : null;
  return {
    metadataBase: new URL(shareBase),
    title: `${title} · 刚果金华人生活服务指南`,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      siteName: "刚果金华人生活服务指南",
      ...(ogImg
        ? { images: [{ url: ogImg, width: 640, height: 480 }] }
        : {}),
    },
    twitter: {
      card: ogImg ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImg ? { images: [ogImg] } : {}),
    },
  };
}

export default async function ShareUpdatePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = await searchParams;
  const data = await loadData(p);
  if (!data) return notFound();
  const { bizName, update } = data;
  const timeText = new Date(update.at).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rawG = sp?.g;
  const guideMode =
    rawG === "chat" || rawG === "moments" ? (rawG as "chat" | "moments") : null;
  const shareTitle = update.title || `${bizName} · 最新动态`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="text-center mb-5">
          <p className="text-[11px] tracking-[0.3em] text-rose-500 font-semibold">
            LATEST · 最新动态
          </p>
          <h1 className="mt-2 text-2xl font-black text-gray-900 leading-tight">
            {update.title || `${bizName} · 最新动态`}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            @【{bizName}】 · {timeText}
          </p>
        </div>

        {update.images && update.images.length > 0 && (
          <div className="space-y-2 mb-5">
            {update.images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-rose-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`动态图 ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        )}

        {update.text && (
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 mb-5">
            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {update.text}
            </p>
          </div>
        )}

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold rounded-2xl shadow-md active:opacity-80"
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
        <ShareGuideOverlay type={guideMode} shareTitle={shareTitle} />
      )}
    </div>
  );
}
