"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Phone,
  ChevronRight,
  ChevronDown,
  Star,
  X,
  ArrowLeft,
  Megaphone,
  Share2,
  MessageCircle,
  Link2,
  Compass,
} from "lucide-react";

import {
  type Business,
  type BusinessUpdate,
  type RawSubmission,
  categories,
  coordsForArea,
  submissionToBusiness,
  businesses,
} from "@/lib/businesses";
import {
  AvailabilityPanel,
  BusinessCard,
  CallChip,
  ContactButtons,
  CopyChip,
  Field,
  SpeakButton,
  WhatsAppChip,
} from "@/components/BusinessCardUI";
import { SubmissionModal, type FormKey } from "@/components/SubmissionModal";
import { homeUsefulItems } from "@/lib/useful-items";
import { FrenchWordDot } from "@/components/FrenchWordDot";
import { ProtectedImg } from "@/components/ProtectedImg";
import { ShareFab } from "@/components/ShareFab";

/* ------------------------------------------------------------------ */
/*  轮播广告位                                                          */
/* ------------------------------------------------------------------ */
interface AdSlide {
  title?: string;
  subtitle?: string;
  bg?: string;       // tailwind 渐变 class 片段
  image?: string;    // 图片背景（优先于 bg）
  emoji?: string;
  phone?: string;
  address?: string;
  darkText?: boolean; // 浅底时用深字
  adTag?: boolean;    // 右上角"广告"角标
  plainImage?: boolean; // 纯图片（不加文字/蒙层/emoji，整张居中显示）
  imageBg?: string;    // plainImage 时的底色
  /** 同站路由（如 "/quiz"）—— router.push 跳转 */
  href?: string;
  /** 商家 submissionId —— 命中 approvedExtras 后跳详情页 */
  bizSubmissionId?: string;
  /** 直接打开发布表单 */
  formKey?: FormKey;
  /** 无障碍标签 */
  ariaLabel?: string;
}

const ads: AdSlide[] = [
  {
    image: "/images/sponsor-v3.webp",
    plainImage: true,
    imageBg: "#fd645a", // 与图片边缘红珊瑚色一致，避免 contain 模式下出现可见留白
    formKey: "merchant",
    ariaLabel: "立即发布商家入驻申请",
  },
  {
    image: "/images/quiz-hero.webp",
    plainImage: true,
    href: "/quiz",
    ariaLabel: "测测你是否适合在刚果金工作",
  },
  {
    image: "/images/concrete-plant-v2.webp",
    plainImage: true,
    adTag: true,
    bizSubmissionId: "1776975944189-0d4c5b", // 中国城搅拌站
    ariaLabel: "中国城搅拌站",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type View = "home" | "category" | "business";

export default function GuidePage() {
  const router = useRouter();
  const [view, setView] = useState<View>("home");
  const [activeCategory, setActiveCategory] = useState<string>("restaurant");
  const [activeSub, setActiveSub] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [approvedExtras, setApprovedExtras] = useState<Business[]>([]);
  const [detailBizId, setDetailBizId] = useState<number | null>(null);
  const [pendingBizSubmissionId, setPendingBizSubmissionId] = useState<string | null>(null);
  const [adFormKey, setAdFormKey] = useState<FormKey | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);

  // 首次访问显示语音播报海报，3 秒后消失；同一浏览器 48h 内只弹一次
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "poster-tts-seen-at";
    const WINDOW_MS = 48 * 60 * 60 * 1000;
    try {
      const raw = localStorage.getItem(KEY);
      const last = raw ? Number(raw) : 0;
      if (Number.isFinite(last) && Date.now() - last < WINDOW_MS) return;
      setPosterOpen(true);
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // localStorage 不可用时直接放弃抑制，最坏每次都弹一次
      setPosterOpen(true);
    }
  }, []);

  // 初始化浏览器历史 + ?biz / ?cat 支持
  // 把 home 当作栈底 state，之后 openCategory / openBusiness 各 push 一层，
  // 这样 iOS 边缘右滑、Android 手势返回就能一步步退回，而不是直接退出站点
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rawBiz = params.get("biz");
    const rawCat = params.get("cat");
    // cleanPath 只去掉 biz/cat，保留 v（部署版本号）和其他未来参数
    const kept = new URLSearchParams(window.location.search);
    kept.delete("biz");
    kept.delete("cat");
    const cleanPath =
      window.location.pathname +
      (kept.toString() ? `?${kept.toString()}` : "");
    // 栈底：home state
    window.history.replaceState({ klgView: "home" }, "", cleanPath);
    if (rawBiz) {
      const id = Number(rawBiz);
      if (Number.isFinite(id)) {
        // /?biz=xx 进入：在 home 之上再压一层 business，保证返回能回到 home
        window.history.pushState({ klgView: "business", bizId: id }, "", cleanPath);
        setDetailBizId(id);
        setView("business");
        return;
      }
      // 非数字 → 当作 submissionId，等 approvedExtras 加载完后再跳
      setPendingBizSubmissionId(rawBiz);
    }
    if (rawCat && categories.some((c) => c.key === rawCat)) {
      // /?cat=xx 进入：在 home 之上再压一层 category
      window.history.pushState(
        { klgView: "category", categoryKey: rawCat },
        "",
        cleanPath
      );
      setActiveCategory(rawCat);
      setActiveSub("全部");
      setSearchQuery("");
      setView("category");
    }
  }, []);

  // popstate：浏览器后退（含手势滑动返回）时根据 state 恢复视图
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = (e: PopStateEvent) => {
      const s = (e.state ?? null) as
        | { klgView?: View; categoryKey?: string; bizId?: number }
        | null;
      const next: View = s?.klgView ?? "home";
      if (next === "category") {
        if (s?.categoryKey) setActiveCategory(s.categoryKey);
        setActiveSub("全部");
        setSearchQuery("");
      } else if (next === "business" && typeof s?.bizId === "number") {
        setDetailBizId(s.bizId);
      }
      setView(next);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 记录访问量
  useEffect(() => {
    const send = () => {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", new Blob([""], { type: "text/plain" }));
        } else {
          fetch("/api/track", { method: "POST", keepalive: true }).catch(() => {});
        }
      } catch {}
    };
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(send);
    } else {
      setTimeout(send, 200);
    }
  }, []);

  // 拉取审核通过的用户提交
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/public/approved")
        .then((r) => r.json())
        .then((d: { records?: RawSubmission[] }) => {
          if (cancelled) return;
          const records = d.records ?? [];
          const items: Business[] = [];
          records.forEach((r, i) => {
            // 旧的 luggage 提交已在 DB 中，统一忽略
            if ((r.type as string) === "luggage") return;
            const b = submissionToBusiness(r, i);
            if (b) items.push(b);
          });
          setApprovedExtras(items);
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

  // 轮播自动切换
  useEffect(() => {
    const t = setInterval(() => setAdIndex((i) => (i + 1) % ads.length), 4000);
    return () => clearInterval(t);
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

  const openCategory = (key: string) => {
    setActiveCategory(key);
    setActiveSub("全部");
    setSearchQuery("");
    if (typeof window !== "undefined") {
      window.history.pushState({ klgView: "category", categoryKey: key }, "");
      window.scrollTo({ top: 0 });
    }
    setView("category");
  };

  const openBusiness = (id: number) => {
    setDetailBizId(id);
    if (typeof window !== "undefined") {
      window.history.pushState({ klgView: "business", bizId: id }, "");
      window.scrollTo({ top: 0 });
    }
    setView("business");
  };

  // approvedExtras 加载完后，把待跳转的 submissionId 解析为 id 并打开详情页
  useEffect(() => {
    if (!pendingBizSubmissionId) return;
    const biz = approvedExtras.find((b) => b.submissionId === pendingBizSubmissionId);
    if (biz) {
      setPendingBizSubmissionId(null);
      openBusiness(biz.id);
    }
  }, [approvedExtras, pendingBizSubmissionId]);

  const onAdClick = (slide: AdSlide) => {
    if (slide.formKey) {
      setAdFormKey(slide.formKey);
      return;
    }
    if (slide.href) {
      router.push(slide.href);
      return;
    }
    if (slide.bizSubmissionId) {
      const biz = allBusinesses.find((b) => b.submissionId === slide.bizSubmissionId);
      if (biz) {
        openBusiness(biz.id);
        return;
      }
      // 还没拉到，硬跳带参数让 mount-time effect 处理
      window.location.assign(`/?biz=${encodeURIComponent(slide.bizSubmissionId)}`);
    }
  };

  const goBack = () => {
    if (typeof window !== "undefined") window.history.back();
    else setView("home");
  };

  const focusOnMap = (id: number | null) => {
    if (typeof window !== "undefined") {
      window.location.href = id ? `/map?focus=${id}` : "/map";
    }
  };

  const detailBiz = useMemo(
    () => allBusinesses.find((b) => b.id === detailBizId) ?? null,
    [allBusinesses, detailBizId]
  );

  return (
    <div className="min-h-screen bg-sky-50">
      {view === "home" && (
        <HomeView
          businesses={allBusinesses}
          onOpenCategory={openCategory}
          adIndex={adIndex}
          setAdIndex={setAdIndex}
          onOpenBusiness={openBusiness}
          onAdClick={onAdClick}
        />
      )}
      {view === "category" && (
        <CategoryView
          businesses={allBusinesses}
          categoryKey={activeCategory}
          activeSub={activeSub}
          setActiveSub={setActiveSub}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          onBack={goBack}
          onOpenBusiness={openBusiness}
        />
      )}
      {view === "business" && detailBiz && (
        <BusinessDetailView
          biz={detailBiz}
          onBack={goBack}
          onFocusMap={() => focusOnMap(detailBiz.id)}
        />
      )}

      <Footer />

      {view === "home" && <ShareFab />}

      {posterOpen && <PosterPopup onClose={() => setPosterOpen(false)} />}

      {adFormKey && (
        <SubmissionModal formKey={adFormKey} onClose={() => setAdFormKey(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Poster Popup — 右上角倒计时（3s 自动消失）                          */
/* ------------------------------------------------------------------ */
function PosterPopup({ onClose }: { onClose: () => void }) {
  const [remaining, setRemaining] = useState(3);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 320);
      return true;
    });
  };

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tick);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    const done = setTimeout(handleClose, 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-md transition-[opacity,backdrop-filter] duration-300 ease-out ${
        closing ? "opacity-0 backdrop-blur-0" : "opacity-100"
      }`}
      aria-live="polite"
      onClick={handleClose}
    >
      <div
        className={`relative w-52 h-52 rounded-3xl shadow-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white overflow-hidden transition-all duration-300 ease-out ${
          closing ? "opacity-0 scale-90" : "opacity-100 scale-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 装饰泡泡 */}
        <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/15" />
        <div className="absolute -bottom-6 -right-4 w-20 h-20 rounded-full bg-white/15" />

        <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-4">
          <div className="text-4xl mb-2 drop-shadow">🔊</div>
          <p className="text-[15px] font-black leading-snug drop-shadow">
            快试试告诉司机<br />你要去哪儿吧！
          </p>
          <span className="mt-2 inline-block px-2 py-0.5 bg-white text-rose-600 rounded-full text-[10px] font-black shadow-sm">
            法语语音播报 · 上线
          </span>
        </div>

        {/* 左上：倒计时徽章（纯展示，不可点） */}
        <div
          aria-hidden
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-white ring-1 ring-white/40 text-[11px] font-black leading-none select-none"
        >
          {remaining > 0 ? remaining : 0}
        </div>

        {/* 右上：立即关闭按钮（始终可点） */}
        <button
          onClick={handleClose}
          aria-label="关闭"
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur flex items-center justify-center text-white ring-1 ring-white/40 active:scale-95"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home View                                                          */
/* ------------------------------------------------------------------ */
function HomeView({
  businesses: allBusinesses,
  onOpenCategory,
  adIndex,
  setAdIndex,
  onOpenBusiness,
  onAdClick,
}: {
  businesses: Business[];
  onOpenCategory: (k: string) => void;
  adIndex: number;
  setAdIndex: (n: number) => void;
  onOpenBusiness: (id: number) => void;
  onAdClick: (slide: AdSlide) => void;
}) {
  const router = useRouter();
  const [mySubmissionIds, setMySubmissionIds] = useState<Set<string>>(new Set());
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // 拉一次本人的发布，找已审核通过的商家 → 默认置顶到热门商家
  useEffect(() => {
    let cancel = false;
    fetch("/api/my/submissions", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((d: { records?: Array<{ id: string; type: string; status: string }> }) => {
        if (cancel) return;
        const ids = new Set(
          (d.records ?? [])
            .filter((r) => r.type === "merchant" && r.status === "approved")
            .map((r) => r.id),
        );
        setMySubmissionIds(ids);
      })
      .catch(() => { /* 静默：未发布或断网都允许 */ });
    return () => {
      cancel = true;
    };
  }, []);

  // 人工精选（b.featured）优先；没有时回落到全部真实商家（排除二手）。
  // 默认（shuffleSeed === 0）：本人 approved 商家置顶（按 id desc），其它按 id desc。
  // 探索（shuffleSeed > 0）：用户已经知道自己的商家了，把所有商家混在一起打乱，
  //   不再让本人置顶——这就是"探索新商家"的意义。
  const featured = useMemo(() => {
    const explicit = allBusinesses.filter((b) => b.featured);
    const pool = explicit.length > 0
      ? explicit
      : allBusinesses.filter((b) => b.category !== "secondhand");

    if (shuffleSeed > 0) {
      const all = [...pool];
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      return all;
    }

    const mine: Business[] = [];
    const rest: Business[] = [];
    for (const b of pool) {
      if (b.submissionId && mySubmissionIds.has(b.submissionId)) mine.push(b);
      else rest.push(b);
    }
    mine.sort((a, b) => b.id - a.id);
    rest.sort((a, b) => b.id - a.id);
    return [...mine, ...rest];
  }, [allBusinesses, mySubmissionIds, shuffleSeed]);

  const [homeQuery, setHomeQuery] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = homeQuery.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };


  return (
    <>
      {/* ---- 顶部横幅 ---- */}
      <section className="relative bg-gradient-to-br from-sky-400 via-sky-500 to-blue-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-4 right-10 w-48 h-48 rounded-full bg-white" />
        </div>
        <Star
          size={28}
          className="absolute top-6 right-6 text-yellow-300 drop-shadow"
          fill="currentColor"
        />
        <Star
          size={16}
          className="absolute top-12 right-16 text-yellow-300 drop-shadow"
          fill="currentColor"
        />

        <span
          id="klg-share-anchor"
          aria-hidden
          className="absolute bottom-16 right-3 w-0 h-0 pointer-events-none"
        />

        <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black mb-2 leading-tight">
            刚果金华人生活服务指南
          </h1>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 backdrop-blur rounded-full text-xs font-medium mb-3">
            <MapPin size={12} /> 金沙萨
          </div>
          <p className="font-handwriting text-xl md:text-2xl text-yellow-200 mb-1.5 tracking-wide">
            帮助刚果金华人更快找到本地服务
          </p>
          <p className="text-sm md:text-base text-sky-50 max-w-md mx-auto">
            买商品 · 找餐厅 · 找住宿 · 找服务
            <br />
            租赁设备 · 二手专区 · 需求大厅
          </p>
        </div>
      </section>

      {/* ---- 轮播广告 ---- */}
      <section className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
        <Carousel index={adIndex} onChange={setAdIndex} onSlideClick={onAdClick} />
      </section>

      {/* ---- 我要找…… + 小搜索 ---- */}
      <section id="categories" className="mt-5 scroll-mt-4">
        <div className="px-4 max-w-4xl mx-auto flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full shrink-0" />
          <h2 className="text-base font-bold text-gray-800 shrink-0">我要找……</h2>
          <form onSubmit={submitSearch} className="flex-1 min-w-0 flex justify-end">
            <div className="flex items-center gap-1 bg-white rounded-full px-2 py-0.5 border border-sky-100 shadow-sm focus-within:border-red-300 max-w-[180px] w-full">
              <Search size={12} className="text-sky-400 shrink-0" />
              <input
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-xs text-gray-900 focus:outline-none py-1"
                inputMode="search"
                aria-label="搜索"
              />
              {homeQuery && (
                <button
                  type="button"
                  onClick={() => setHomeQuery("")}
                  aria-label="清空"
                  className="shrink-0"
                >
                  <X size={12} className="text-gray-400" />
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto scrollbar-none pb-2">
          <div className="grid grid-rows-2 grid-flow-col auto-cols-[76px] gap-2 px-4 w-max">
            {/* 需求大厅 — 置顶，淡亮橙色 */}
            <button
              onClick={() => router.push("/requests")}
              className="h-20 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl shadow-sm border border-orange-300 ring-1 ring-orange-200 hover:border-orange-400 active:scale-95 transition"
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-200/70">
                <Megaphone size={20} className="text-orange-600" />
              </span>
              <span className="text-[11px] font-bold text-orange-700">
                需求大厅
              </span>
            </button>

            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => onOpenCategory(cat.key)}
                  className="h-20 flex flex-col items-center justify-center gap-1 bg-white rounded-2xl shadow-sm border border-sky-100 hover:border-red-300 active:scale-95 transition"
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}1A` }}
                  >
                    <Icon size={20} style={{ color: cat.color }} />
                  </span>
                  <span className="text-[11px] font-medium text-gray-700">
                    {cat.label}
                  </span>
                </button>
              );
            })}

          </div>
        </div>
      </section>

      {/* ---- 实用信息 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-sky-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">实用信息</h2>
          <Link
            href="/useful"
            className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-sky-600 hover:text-sky-700 active:scale-95 transition"
          >
            全部<ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {homeUsefulItems.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className="flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition"
            >
              <span className="text-2xl leading-none">{it.emoji}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center gap-1">
                  {it.title}
                  {it.key === "french-word" && <FrenchWordDot />}
                </div>
                <div className="text-[10px] text-gray-600 truncate">{it.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- 热门商家（Tinder 卡片栈） ---- */}
      <FeaturedSwipeStack
        key={shuffleSeed}
        items={featured}
        onOpen={onOpenBusiness}
        onShuffle={() => setShuffleSeed((s) => s + 1)}
      />

      {/* ---- 许愿池专区 ---- */}
      <WishingPoolBanner />

      {/* ---- 微信群入口 ---- */}
      <WeChatGroupBanner />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  热门商家 — Tinder 卡片栈：拖拽、旋转、飞出切换                        */
/* ------------------------------------------------------------------ */
// 阈值降到 60px —— 单手大拇指移动幅度就能触发切换
const SWIPE_THRESHOLD = 60;
const SWIPE_FLY_MS = 320;

function FeaturedSwipeStack({
  items,
  onOpen,
  onShuffle,
}: {
  items: Business[];
  onOpen: (id: number) => void;
  onShuffle: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const draggingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  // items 变化时，把 index 夹回有效范围
  useEffect(() => {
    if (items.length && index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (items.length === 0) return null;

  const n = items.length;
  const top = items[index % n];
  const second = n > 1 ? items[(index + 1) % n] : null;
  const third = n > 2 ? items[(index + 2) % n] : null;

  const rot = Math.max(-22, Math.min(22, drag.x * 0.06));
  const dir: 0 | 1 | -1 = drag.x > 12 ? 1 : drag.x < -12 ? -1 : 0;
  const indOpacity = Math.min(1, Math.abs(drag.x) / SWIPE_THRESHOLD);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animating) return;
    draggingRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !startRef.current) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  };

  const advance = (direction: 1 | -1) => {
    suppressClickRef.current = true;
    setAnimating(true);
    const vw = typeof window !== "undefined" ? window.innerWidth : 600;
    setDrag({ x: direction * (vw + 200), y: drag.y * 2 });
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % n);
      setDrag({ x: 0, y: 0 });
      // 下一帧关掉 animating，让位置瞬间归位，下一张卡从 0 开始动
      requestAnimationFrame(() => {
        setAnimating(false);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 60);
      });
    }, SWIPE_FLY_MS);
  };

  const finish = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const dx = drag.x;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      advance(dx > 0 ? 1 : -1);
    } else {
      // 吸附回弹
      if (Math.abs(dx) > 5) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 120);
      }
      setAnimating(true);
      setDrag({ x: 0, y: 0 });
      window.setTimeout(() => setAnimating(false), 300);
    }
  };

  const handleTopClick = () => {
    if (suppressClickRef.current) return;
    onOpen(top.id);
  };

  // 所有卡层都 absolute inset-0，高度由外层容器统一固定。
  // [&>div]:h-full 强制 BusinessCard 根节点填满 → 每张卡视觉尺寸一致。
  const behind = (
    biz: Business,
    depth: 1 | 2,
    key: string,
  ) => (
    <div
      key={key}
      className="absolute inset-0 pointer-events-none [&>div]:h-full"
      style={{
        transform: depth === 1 ? "scale(0.97)" : "scale(0.94)",
        opacity: depth === 1 ? 0.75 : 0.45,
        filter: depth === 1 ? "none" : "brightness(0.95)",
        zIndex: depth === 1 ? 2 : 1,
        transition: "transform 300ms cubic-bezier(.2,.8,.2,1), opacity 300ms",
      }}
    >
      <BusinessCard biz={biz} />
    </div>
  );

  return (
    <section className="max-w-4xl mx-auto px-4 mt-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-5 bg-red-400 rounded-full" />
        <h2 className="text-base font-bold text-gray-800">热门商家</h2>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShuffle();
          }}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition"
          aria-label="探索新商家"
        >
          <Compass size={12} /> 探索新商家
        </button>
      </div>

      <div className="relative mx-auto w-full h-[420px] md:h-[460px]">
        {third && behind(third, 2, `bg2-${(index + 2) % n}`)}
        {second && behind(second, 1, `bg1-${(index + 1) % n}`)}

        <div
          key={`top-${index % n}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onClick={handleTopClick}
          className="absolute inset-0 select-none [&>div]:h-full"
          style={{
            touchAction: "pan-y",
            transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rot}deg)`,
            transition: animating
              ? `transform ${SWIPE_FLY_MS}ms cubic-bezier(.2,.8,.2,1)`
              : draggingRef.current
                ? "none"
                : "transform 280ms cubic-bezier(.2,.8,.2,1)",
            zIndex: 3,
            willChange: "transform",
            cursor: draggingRef.current ? "grabbing" : "grab",
          }}
        >
          <BusinessCard biz={top} />
        </div>
      </div>

    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Carousel                                                           */
/* ------------------------------------------------------------------ */
function Carousel({
  index,
  onChange,
  onSlideClick,
}: {
  index: number;
  onChange: (n: number) => void;
  onSlideClick?: (slide: AdSlide) => void;
}) {
  const slide = ads[index];
  const clickable = !!(slide.href || slide.bizSubmissionId || slide.formKey);

  // 首次挂载时预取带图片的广告，避免第一次切到时文字先出、图片后出的错位感
  useEffect(() => {
    if (typeof window === "undefined") return;
    ads.forEach((a) => {
      if (a.image) {
        const img = new window.Image();
        img.src = a.image;
      }
    });
  }, []);

  const plain = !!slide.plainImage;
  const darkText = !!slide.darkText;
  const bgGradient = slide.bg ? `bg-gradient-to-r ${slide.bg}` : "";
  const textClass = slide.image ? "text-white" : darkText ? "text-gray-900" : "text-white";
  const subtitleClass = slide.image
    ? "text-white/90"
    : darkText
      ? "text-gray-700"
      : "text-white/90";
  // 指示点放在轮播容器外、首页浅色底上，固定用深灰，保证对比度一致
  const dotActive = "bg-sky-500";
  const dotInactive = "bg-sky-200";
  const phoneChipClass = slide.image
    ? "bg-white/25 hover:bg-white/40 text-white"
    : darkText
      ? "bg-white/80 hover:bg-white text-red-700"
      : "bg-white/25 hover:bg-white/40 text-white";

  return (
    <div>
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSlideClick?.(slide) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSlideClick?.(slide);
              }
            }
          : undefined
      }
      aria-label={slide.ariaLabel}
      className={`relative rounded-2xl overflow-hidden shadow-lg aspect-[10/3] ${bgGradient} ${
        clickable ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
      }`}
      style={plain && slide.imageBg ? { background: slide.imageBg } : undefined}
    >
      {/* 切换时整块内容一起淡入，图/字同步出现 */}
      <div key={index} className="absolute inset-0 animate-slide-in">
        {slide.image && plain ? (
          // 纯图模式：容器 aspect 与图片比例一致（10:3），cover 刚好贴合零裁切
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.image}
            alt={slide.title ?? "广告"}
            fetchPriority="high"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : slide.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt=""
              aria-hidden
              fetchPriority="high"
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            {/* 左侧深一点保证文字可读，右侧几乎透明让图主体看得清 */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-black/10" />
          </>
        ) : null}

        {!plain && (
          <div className={`absolute inset-0 flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 ${textClass}`}>
            {slide.emoji && (
              <span className="text-4xl md:text-5xl shrink-0 drop-shadow">{slide.emoji}</span>
            )}
            <div className="flex-1 min-w-0">
              {slide.title && (
                <p className="text-base md:text-xl font-bold leading-snug truncate drop-shadow">{slide.title}</p>
              )}
              {(slide.subtitle || slide.address) && (
                <p className={`text-xs md:text-sm ${subtitleClass} mt-0.5 leading-snug drop-shadow`}>
                  {slide.subtitle}
                  {slide.address && (
                    <>
                      <span className="mx-1 opacity-60">·</span>
                      <MapPin size={11} className="inline -mt-0.5" /> {slide.address}
                    </>
                  )}
                </p>
              )}
              {slide.phone && (
                <a
                  href={`tel:${slide.phone.replace(/\s+/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full backdrop-blur text-xs md:text-sm font-semibold ${phoneChipClass}`}
                >
                  <Phone size={12} /> {slide.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {slide.adTag && (
          <span className="absolute top-1.5 right-2 text-[9px] font-normal text-white/55 tracking-[0.2em] leading-none select-none">
            广告
          </span>
        )}
      </div>

    </div>
      {/* 指示点放在轮播外部，不遮挡广告主体 */}
      <div className="mt-2 flex justify-center gap-1.5">
        {ads.map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            aria-label={`广告 ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? `w-6 ${dotActive}` : `w-1.5 ${dotInactive}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category View                                                      */
/* ------------------------------------------------------------------ */
function CategoryView({
  businesses: allBusinesses,
  categoryKey,
  activeSub,
  setActiveSub,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  onBack,
  onOpenBusiness,
}: {
  businesses: Business[];
  categoryKey: string;
  activeSub: string;
  setActiveSub: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  showSearch: boolean;
  setShowSearch: (b: boolean) => void;
  onBack: () => void;
  onOpenBusiness: (id: number) => void;
}) {
  const cat = categories.find((c) => c.key === categoryKey)!;
  const subs = useMemo(() => ["全部", ...cat.sub], [cat]);

  const filtered = useMemo(() => {
    const list = allBusinesses.filter((b) => {
      if (b.category !== cat.key) return false;
      if (activeSub !== "全部") {
        const subs = (b.subcategory ?? "").split("、").map((s) => s.trim()).filter(Boolean);
        if (!subs.includes(activeSub)) return false;
      }
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.mainService.toLowerCase().includes(q) ||
        b.area.toLowerCase().includes(q) ||
        (b.address?.toLowerCase().includes(q) ?? false) ||
        (b.intro?.toLowerCase().includes(q) ?? false)
      );
    });
    // 个人型 + 近 7 天内更新过档期 → 自动置顶（按更新时间倒序）
    const FRESH_MS = 7 * 24 * 3600 * 1000;
    const now = Date.now();
    const freshAt = (b: Business): number => {
      if (b.merchantType !== "individual" || !b.availabilityUpdatedAt) return 0;
      const t = Date.parse(b.availabilityUpdatedAt);
      if (!Number.isFinite(t) || now - t > FRESH_MS) return 0;
      return t;
    };
    return [...list].sort((a, b) => {
      const fb = freshAt(b);
      const fa = freshAt(a);
      if (fa !== fb) return fb - fa;
      return 0;
    });
  }, [allBusinesses, cat.key, activeSub, searchQuery]);

  const Icon = cat.icon;

  return (
    <>
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon size={20} />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">{cat.label}</h1>
            <p className="text-xs text-white/80">共 {filtered.length} 条信息</p>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-sky-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-sky-50 rounded-xl px-3 py-2">
                <Search size={18} className="text-sky-400 shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`在「${cat.label}」中搜索…`}
                  className="flex-1 ml-2 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="text-sm text-gray-500 shrink-0"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 bg-sky-50 rounded-xl px-4 py-2.5 text-sm text-gray-400"
            >
              <Search size={18} /> 在「{cat.label}」中搜索…
            </button>
          )}
        </div>
      </div>

      {cat.sub.length > 0 && (
        <div className="bg-white border-b border-sky-100">
          <div className="max-w-4xl mx-auto">
            <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-3">
              {subs.map((s) => {
                const isActive = activeSub === s;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSub(s)}
                    className={`px-3.5 py-1.5 rounded-full shrink-0 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-red-400 text-white shadow-sm"
                        : "bg-sky-50 text-gray-600 hover:bg-sky-100"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 min-h-[40vh]">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Icon size={40} className="mx-auto text-sky-300 mb-3" />
            <p className="text-gray-400 text-sm">该分类暂无信息，欢迎商家入驻发布</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Business Detail View                                               */
/* ------------------------------------------------------------------ */
function BusinessDetailView({
  biz,
  onBack,
  onFocusMap,
}: {
  biz: Business;
  onBack: () => void;
  onFocusMap: () => void;
}) {
  const cat = categories.find((c) => c.key === biz.category);
  const hasUpdates = !!biz.updates && biz.updates.length > 0;
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [bizShareOpen, setBizShareOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // BreathingPeek 上报的整页下移量（呼吸时 ~92px / 拖拽时跟手）
  const [breathShift, setBreathShift] = useState(0);
  const [shiftSnap, setShiftSnap] = useState(true); // 顺滑过渡 vs 跟手
  const handleShift = useCallback((n: number) => {
    setBreathShift(n);
    // 0 / PEEK_HEIGHT 这种被动状态走 transition；中间值（拖拽中）禁动画
    setShiftSnap(n === 0 || n === PEEK_HEIGHT);
  }, []);

  // 商家主页分享 key：用户提交的用 submissionId；seed 用 seed-{id}
  const bizShareKey = biz.submissionId ?? `seed-${biz.id}`;
  const bizShareConfig: ShareConfig = {
    url: `${SHARE_ORIGIN}/share/b/${bizShareKey}`,
    displayTitle: biz.name,
    displayCaption: "刚果金华人生活服务指南",
    navTitle: biz.name,
  };

  return (
    <>
      {hasUpdates && (
        <BreathingPeek
          biz={biz}
          onOpen={() => setUpdatesOpen(true)}
          onShiftChange={handleShift}
        />
      )}

      <div
        style={{
          transform: `translateY(${breathShift}px)`,
          transition: shiftSnap
            ? breathShift > 0
              ? "transform 900ms cubic-bezier(.22,1,.36,1)"
              : "transform 700ms cubic-bezier(.4,0,.6,1)"
            : "none",
          willChange: "transform",
        }}
      >
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold leading-tight truncate">{biz.name}</h1>
              {biz.merchantType === "individual" && (
                <span className="shrink-0 px-1.5 py-0.5 bg-amber-400 text-white text-[10px] font-bold rounded-full">
                  个人型
                </span>
              )}
              {biz.merchantType === "company" && (
                <span className="shrink-0 px-1.5 py-0.5 bg-indigo-400 text-white text-[10px] font-bold rounded-full">
                  公司型
                </span>
              )}
            </div>
            <p className="text-xs text-white/80">
              {cat?.label}
              {biz.subcategory ? ` · ${biz.subcategory}` : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="relative h-56 md:h-72">
            <ProtectedImg src={biz.image} alt={biz.name} className="w-full h-full object-cover" />
            {biz.featured && (
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full shadow flex items-center gap-1">
                <Star size={12} fill="white" /> 热门
              </span>
            )}
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900">{biz.name}</h2>
            {biz.englishName && (
              <p className="text-xs text-gray-500 mt-0.5">{biz.englishName}</p>
            )}

            {biz.category !== "secondhand" && (
              <button
                onClick={onFocusMap}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-400 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <MapPin size={16} /> 在地图上查看
              </button>
            )}

            <button
              type="button"
              onClick={() => setBizShareOpen(true)}
              className={`${biz.category === "secondhand" ? "mt-4" : "mt-2"} w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 active:opacity-85 text-white text-sm font-semibold rounded-xl`}
            >
              <Share2 size={15} /> 分享到微信
            </button>

            <div className="mt-5 space-y-3 text-sm">
              {biz.address && (
                <Field
                  label="具体地址"
                  value={biz.address}
                  action={
                    biz.category !== "secondhand" ? (
                      <SpeakButton
                        text={`Je veux aller à cette adresse, ${biz.address}`}
                        cacheKey={`biz-${biz.id}-addr`}
                      />
                    ) : undefined
                  }
                />
              )}
              <Field label="所在区域" value={biz.area} />
              <Field label="联系人" value={biz.contactPerson} />
              <Field
                label="微信号"
                value={biz.wechat}
                action={<CopyChip text={biz.wechat} label="复制微信号" doneLabel="已复制" />}
              />
              <Field
                label="电话 / WhatsApp"
                value={biz.phone}
                action={
                  <span className="flex gap-1.5">
                    <CallChip phone={biz.phone} />
                    <WhatsAppChip phone={biz.phone} />
                  </span>
                }
              />
              <Field label="是否有门店" value={biz.hasStore} />
              <Field label="主营产品或服务" value={biz.mainService} />
            </div>

            <ContactButtons biz={biz} className="mt-5" />
          </div>
        </div>

        {biz.merchantType === "individual" && biz.availability && biz.availability.length > 0 && (
          <AvailabilityPanel
            dates={biz.availability}
            updatedAt={biz.availabilityUpdatedAt}
          />
        )}

        {biz.gallery && biz.gallery.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">相册</h3>
            <div className="grid grid-cols-3 gap-2">
              {biz.gallery.map((src, i) => (
                <button
                  type="button"
                  key={`${src}-${i}`}
                  onClick={() => setLightboxIdx(i)}
                  className="relative aspect-square cursor-zoom-in active:scale-[0.98] transition"
                  aria-label={`查看 ${biz.name} 相册 ${i + 1}`}
                >
                  <ProtectedImg
                    src={src}
                    alt={`${biz.name} 相册 ${i + 1}`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full rounded-lg object-cover border border-sky-50"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
      </div>

      {hasUpdates && updatesOpen && (
        <UpdatesSheet
          biz={biz}
          onClose={() => setUpdatesOpen(false)}
        />
      )}

      {bizShareOpen && (
        <ShareSheet
          config={bizShareConfig}
          onClose={() => setBizShareOpen(false)}
        />
      )}

      {lightboxIdx !== null && biz.gallery && (
        <GalleryLightbox
          images={biz.gallery}
          index={lightboxIdx}
          onIndex={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
          alt={biz.name}
        />
      )}
    </>
  );
}

function GalleryLightbox({
  images,
  index,
  onIndex,
  onClose,
  alt,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  alt: string;
}) {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      else if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 200);
  };

  const src = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/90 flex items-center justify-center transition-opacity duration-200 ${
        mounted && !closing ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="关闭"
        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center active:scale-95"
      >
        <X size={22} />
      </button>

      <div
        className="relative max-w-[100vw] max-h-[100dvh] w-full h-full flex items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ProtectedImg
          src={src}
          alt={alt}
          className="max-w-full max-h-[90dvh] object-contain rounded-xl select-none"
        />
      </div>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index - 1);
          }}
          aria-label="上一张"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index + 1);
          }}
          aria-label="下一张"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={22} className="rotate-180" />
        </button>
      )}

      {images.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BreathingPeek —— 无显式 chip，进页面后周期性把整页轻微下移，          */
/*  顶部露出最新动态缩略 + 一行小字"下拉查看最新动态"，再回弹              */
/* ------------------------------------------------------------------ */
const PEEK_HEIGHT = 92;

function BreathingPeek({
  biz,
  onOpen,
  onShiftChange,
}: {
  biz: Business;
  onOpen: () => void;
  onShiftChange: (n: number) => void;
}) {
  const [phase, setPhase] = useState<"hidden" | "peeking">("hidden");
  const [dragY, setDragY] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);

  // 周期性呼吸：进页面 2s 后第一次 peek，停 3s 让用户看清楚，之后每 10s 再来。
  // 仅在接近顶部（scrollY < 80）且 tab 可见时触发，避免打断阅读。
  useEffect(() => {
    let tid = 0;
    let alive = true;
    const tick = (firstWait: number) => {
      tid = window.setTimeout(() => {
        if (!alive) return;
        const nearTop = (window.scrollY ?? 0) < 80;
        const visibleTab = typeof document === "undefined" || !document.hidden;
        if (!nearTop || !visibleTab) {
          tick(5_000); // 暂时不合适，5s 后再试
          return;
        }
        setPhase("peeking");
        tid = window.setTimeout(() => {
          if (!alive) return;
          setPhase("hidden");
          tick(10_000);
        }, 3_000);
      }, firstWait);
    };
    tick(2_000);
    return () => {
      alive = false;
      window.clearTimeout(tid);
    };
  }, []);

  // 把当前 shift 值上报给父组件，触发整页下移
  useEffect(() => {
    if (dragY !== null) onShiftChange(Math.min(dragY, PEEK_HEIGHT * 1.2));
    else onShiftChange(phase === "peeking" ? PEEK_HEIGHT : 0);
  }, [phase, dragY, onShiftChange]);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = e.clientY;
    setDragY(0);
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {}
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startRef.current == null) return;
    const dy = Math.max(0, e.clientY - startRef.current);
    setDragY(Math.min(dy, 220));
  };
  const up = () => {
    const cur = dragY;
    startRef.current = null;
    setDragY(null);
    if (cur !== null && cur > 60) onOpen();
  };

  const visible = phase === "peeking" || (dragY !== null && dragY > 4);
  const latest = biz.updates?.[0];
  const thumbs = (latest?.images ?? []).slice(0, 3);
  const dragging = dragY !== null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 px-3 pointer-events-none"
      style={{
        transform: `translateY(${visible ? 0 : -130}px)`,
        transition: dragging
          ? "none"
          : visible
          ? "transform 900ms cubic-bezier(.22,1,.36,1)"   // 进：缓缓滑出
          : "transform 700ms cubic-bezier(.4,0,.6,1)",     // 退：丝滑收回
        willChange: "transform",
      }}
      aria-hidden={!visible}
    >
      <div
        role="button"
        tabIndex={visible ? 0 : -1}
        onClick={onOpen}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={`查看最新动态（${biz.updates?.length ?? 0} 条）`}
        className="pointer-events-auto mx-auto max-w-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-b-3xl shadow-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer active:opacity-95"
        style={{ touchAction: "none", boxShadow: "0 8px 22px rgba(244,63,94,0.35)" }}
      >
        {thumbs.length > 0 ? (
          <div className="flex -space-x-2 shrink-0">
            {thumbs.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                aria-hidden
                className="w-9 h-9 rounded-full border-2 border-rose-500 object-cover bg-rose-200"
              />
            ))}
          </div>
        ) : (
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-base shrink-0">
            🆕
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-white/85 leading-tight">
            最新动态 · {biz.updates?.length ?? 0} 条
          </div>
          <div className="text-[13px] font-bold truncate leading-tight">
            {latest?.title ?? biz.name}
          </div>
        </div>
        <span className="text-[11px] text-white/90 font-semibold shrink-0 flex items-center gap-0.5">
          下拉查看 <ChevronDown size={12} />
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  最新动态全屏 Sheet —— 从上滑下，占满一屏                             */
/* ------------------------------------------------------------------ */
function UpdatesSheet({
  biz,
  onClose,
}: {
  biz: Business;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 280);
  };

  const updates = biz.updates ?? [];

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        mounted && !closing ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`absolute inset-x-0 top-0 bg-gradient-to-b from-rose-50 via-white to-white shadow-2xl rounded-b-3xl max-h-[100dvh] flex flex-col transition-transform duration-300 ease-out ${
          mounted && !closing ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ height: "100dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-rose-100 shrink-0">
          <span className="w-1 h-5 bg-rose-500 rounded-full" />
          <h3 className="text-base font-bold text-gray-800 flex-1 min-w-0 truncate">
            {biz.name} · 最新动态
          </h3>
          <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[11px] font-bold">
            {updates.length} 条
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="关闭"
            className="w-8 h-8 -mr-1 rounded-full hover:bg-rose-100 flex items-center justify-center active:scale-95 transition"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {updates.map((u) => (
            <UpdateCard key={u.id} biz={biz} u={u} />
          ))}
          <p className="pt-2 pb-8 text-center text-[11px] text-gray-400">
            已展示全部 {updates.length} 条动态
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  单条动态卡（带分享按钮）                                             */
/* ------------------------------------------------------------------ */
const SHARE_ORIGIN = "https://share.blackstream.site";

function UpdateCard({
  biz,
  u,
}: {
  biz: Business;
  u: BusinessUpdate;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const shareConfig: ShareConfig | null = biz.submissionId
    ? {
        url: `${SHARE_ORIGIN}/share/u/${biz.submissionId}/${u.id}`,
        displayTitle: u.title || `${biz.name} · 最新动态`,
        displayCaption: `@【${biz.name}】的最新活动`,
        navTitle: u.title || `${biz.name} · 最新动态`,
      }
    : null;

  return (
    <>
      <UpdateCardBody biz={biz} u={u} onShare={() => setSheetOpen(true)} />
      {sheetOpen && shareConfig && (
        <ShareSheet config={shareConfig} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

function UpdateCardBody({
  biz,
  u,
  onShare,
}: {
  biz: Business;
  u: BusinessUpdate;
  onShare: () => void;
}) {

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
      <div className="px-4 pt-3.5">
        {u.title && (
          <h4 className="text-base font-bold text-gray-900 leading-snug">
            {u.title}
          </h4>
        )}
        <p className="text-[11px] text-gray-400 mt-0.5">
          {new Date(u.at).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {u.text && (
          <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {u.text}
          </p>
        )}
      </div>

      {u.images && u.images.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 px-4">
          {u.images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-rose-50"
            >
              <ProtectedImg
                src={src}
                alt={`动态图 ${i + 1}`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover block"
              />
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 mt-2 border-t border-rose-50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 active:opacity-80 text-white text-xs font-bold rounded-full shadow-sm"
        >
          <Share2 size={13} />
          分享
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  分享底部 Sheet — 小红书 / 微信风格                                    */
/* ------------------------------------------------------------------ */
interface ShareConfig {
  // 最终分享链接（绝对 URL，微信爬取目标）
  url: string;
  // Sheet 顶部大字（卡片主标题预览）
  displayTitle: string;
  // Sheet 顶部小字（卡片副标题预览）
  displayCaption: string;
  // 系统分享表用的标题（较短）
  navTitle: string;
}

function ShareSheet({
  config,
  onClose,
}: {
  config: ShareConfig;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const shareUrl = config.url;
  const shareTitle = config.navTitle;
  const inWeChat =
    typeof navigator !== "undefined" &&
    /MicroMessenger/i.test(navigator.userAgent);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 260);
  };

  const copy = async () => {
    if (!shareUrl) return false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      // execCommand 兜底
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  // 微信内：必须把当前页导航到 /share/u/... 分享页，微信点右上角「…」
  // 才会抓到我们准备好的 OG 卡片（否则抓的是首页/详情页 URL，出不来卡片）
  const toChat = async () => {
    if (inWeChat) {
      if (!shareUrl) return;
      window.location.href = `${shareUrl}?g=chat`;
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        handleClose();
        return;
      } catch {
        /* 用户取消 → 兜底复制 */
      }
    }
    const ok = await copy();
    setToast(ok ? "链接已复制，打开微信粘贴给好友" : "复制失败，请手动长按链接");
    window.setTimeout(() => {
      setToast(null);
      handleClose();
    }, 1600);
  };

  const toMoments = async () => {
    if (inWeChat) {
      if (!shareUrl) return;
      window.location.href = `${shareUrl}?g=moments`;
      return;
    }
    const ok = await copy();
    setToast(ok ? "链接已复制，打开微信发到朋友圈" : "复制失败，请手动长按链接");
    window.setTimeout(() => {
      setToast(null);
      handleClose();
    }, 1600);
  };

  const copyOnly = async () => {
    const ok = await copy();
    setToast(ok ? "链接已复制" : "复制失败");
    window.setTimeout(() => {
      setToast(null);
      handleClose();
    }, 1400);
  };

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black/50 flex items-end justify-center transition-opacity duration-300 ${
        mounted && !closing ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md bg-white rounded-t-3xl shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
          mounted && !closing ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-5 pt-2 pb-3 text-center">
          <p className="text-sm text-gray-800 font-semibold truncate">
            {config.displayTitle}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            {config.displayCaption}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 pt-3 pb-4">
          <ShareTile
            label="微信好友"
            color="from-emerald-500 to-green-500"
            icon={<MessageCircle size={22} />}
            onClick={toChat}
          />
          <ShareTile
            label="朋友圈"
            color="from-teal-500 to-cyan-500"
            icon={
              <div className="relative w-6 h-6 flex items-center justify-center">
                <span className="absolute w-2 h-2 rounded-full bg-white -translate-x-2 -translate-y-1" />
                <span className="absolute w-2 h-2 rounded-full bg-white translate-x-2 -translate-y-1" />
                <span className="absolute w-2 h-2 rounded-full bg-white translate-y-2" />
              </div>
            }
            onClick={toMoments}
          />
          <ShareTile
            label="复制链接"
            color="from-gray-400 to-gray-500"
            icon={<Link2 size={22} />}
            onClick={copyOnly}
          />
        </div>

        <div className="border-t border-gray-100 mx-5" />
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3.5 text-sm text-gray-500 font-medium active:bg-gray-50"
        >
          取消
        </button>
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 top-[30%] z-[70] pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-black/75 text-white text-sm font-medium shadow-lg backdrop-blur">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareTile({
  label,
  color,
  icon,
  onClick,
}: {
  label: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-2 active:scale-95 transition"
    >
      <span
        className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} text-white shadow-md flex items-center justify-center`}
      >
        {icon}
      </span>
      <span className="text-[11px] text-gray-600 font-medium">{label}</span>
    </button>
  );
}


/* ------------------------------------------------------------------ */
/*  许愿池专区 — 热门商家之后、群聊二维码之前                              */
/* ------------------------------------------------------------------ */
function WishingPoolBanner() {
  return (
    <section className="max-w-4xl mx-auto px-4 mt-3">
      <Link
        href="/demand"
        className="relative block rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 text-white active:scale-[0.99] transition"
      >
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/15" />
        <div className="absolute -bottom-10 -right-6 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute top-8 right-20 w-3 h-3 rounded-full bg-white/40" />
        <div className="absolute bottom-10 left-24 w-2 h-2 rounded-full bg-white/50" />

        <div className="relative flex flex-col items-center text-center px-4 py-6 md:px-6 md:py-8">
          <span className="text-[7rem] md:text-[9rem] leading-none drop-shadow-lg">🪷</span>
          <h3 className="mt-2 text-3xl md:text-4xl font-black leading-tight drop-shadow">
            许愿池
          </h3>
          <p className="mt-2 text-base md:text-lg text-white/95 leading-snug drop-shadow font-semibold">
            你一愿 我一愿
            <br />
            刚果金变家里面
          </p>
          <span className="mt-4 inline-flex items-center gap-1 px-5 py-2 bg-white/95 text-teal-600 rounded-full text-sm md:text-base font-bold shadow">
            无聊就点我一下 <ChevronRight size={16} />
          </span>
        </div>
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  群主微信入口（群已满 200，改为加群主邀请）                             */
/* ------------------------------------------------------------------ */
function WeChatGroupBanner() {
  return (
    <section className="max-w-4xl mx-auto px-4 mt-8 pb-8">
      <div className="rounded-2xl overflow-hidden shadow-md border border-emerald-100 bg-white">
        <p className="px-4 pt-4 text-center text-sm md:text-base font-semibold text-gray-800 leading-snug">
          欢迎添加小程序客服，加入
          <br className="sm:hidden" />
          <span className="text-emerald-600">【刚果金华人社群】</span>微信群聊
        </p>
        <div className="p-4 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/qr/community-wechat.png?v=2"
            alt="刚果金华人社群客服二维码"
            className="w-56 h-56 md:w-64 md:h-64 object-contain"
          />
        </div>
        <div className="px-4 pb-5 text-center space-y-1">
          <p className="text-base md:text-lg font-black text-gray-900">
            小程序不能解决的问题，来群聊解决！
          </p>
          <p className="text-[11px] md:text-xs text-gray-500 leading-relaxed">
            任何商家或个人，在本平台如有推广需求，欢迎联系客服
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-4">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm space-y-2">
        <p className="text-white font-semibold">刚果金华人生活服务指南</p>
        <p className="text-[11px] leading-relaxed text-gray-500 text-left max-w-md mx-auto">
          本小程序仅作为同城信息与服务对接平台，平台内容由相关发布方提供，请用户自行核实并审慎判断。因交易或合作引起的风险、纠纷及损失，由相关方自行承担。
        </p>
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} 版权所有</p>
      </div>
    </footer>
  );
}
