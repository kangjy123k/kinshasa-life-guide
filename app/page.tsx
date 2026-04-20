"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  ArrowLeft,
  QrCode,
  AlertTriangle,
  Megaphone,
  Plane,
  Sparkles,
  ShoppingCart,
  Store,
  Briefcase,
  UserPlus,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  type Business,
  type RawSubmission,
  categories,
  coordsForArea,
  submissionToBusiness,
  businesses,
} from "@/lib/businesses";
import {
  BusinessCard,
  CallChip,
  ContactButtons,
  CopyChip,
  Field,
  SpeakButton,
  WhatsAppChip,
} from "@/components/BusinessCardUI";
import { SubmissionModal, type FormKey } from "@/components/SubmissionModal";

/* ------------------------------------------------------------------ */
/*  轮播广告位                                                          */
/* ------------------------------------------------------------------ */
interface AdSlide {
  title: string;
  subtitle: string;
  bg?: string;       // tailwind 渐变 class 片段
  image?: string;    // 图片背景（优先于 bg）
  emoji: string;
  phone?: string;
  address?: string;
  darkText?: boolean; // 浅底时用深字
  adTag?: boolean;    // 右上角"广告"角标
}

const ads: AdSlide[] = [
  {
    title: "欢迎商家入驻名录",
    subtitle: "免费收录 · 让客户更快找到你",
    bg: "from-red-300 via-rose-300 to-red-400",
    emoji: "🏪",
    darkText: true,
  },
  {
    title: "混凝土搅拌站",
    subtitle: "工程建材一站供应 · 价格实惠",
    image: "/images/concrete-plant.jpg",
    emoji: "🏗️",
    phone: "+243823170887",
    address: "中国城",
    adTag: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type View = "home" | "category" | "business";

export default function GuidePage() {
  const [view, setView] = useState<View>("home");
  const [activeCategory, setActiveCategory] = useState<string>("restaurant");
  const [activeSub, setActiveSub] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [formOpen, setFormOpen] = useState<FormKey | null>(null);
  const [approvedExtras, setApprovedExtras] = useState<Business[]>([]);
  const [detailBizId, setDetailBizId] = useState<number | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);

  // 首次访问显示语音播报海报，3 秒后消失
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("poster-tts-seen")) return;
    setPosterOpen(true);
    sessionStorage.setItem("poster-tts-seen", "1");
  }, []);

  // 初始化浏览器历史 + ?biz=<id> 支持
  // 把 home 当作栈底 state，之后 openCategory / openBusiness 各 push 一层，
  // 这样 iOS 边缘右滑、Android 手势返回就能一步步退回，而不是直接退出站点
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("biz");
    const cleanPath = window.location.pathname;
    // 栈底：home state
    window.history.replaceState({ klgView: "home" }, "", cleanPath);
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id)) return;
    // /?biz=xx 进入：在 home 之上再压一层 business，保证返回能回到 home
    window.history.pushState({ klgView: "business", bizId: id }, "", cleanPath);
    setDetailBizId(id);
    setView("business");
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
            if (r.type === "luggage") return;
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
          onOpenForm={setFormOpen}
          onOpenBusiness={openBusiness}
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

      {formOpen && (
        <SubmissionModal formKey={formOpen} onClose={() => setFormOpen(null)} />
      )}

      {posterOpen && <PosterPopup onClose={() => setPosterOpen(false)} />}
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
  onOpenForm,
  onOpenBusiness,
}: {
  businesses: Business[];
  onOpenCategory: (k: string) => void;
  adIndex: number;
  setAdIndex: (n: number) => void;
  onOpenForm: (k: FormKey) => void;
  onOpenBusiness: (id: number) => void;
}) {
  const router = useRouter();
  const featured = allBusinesses
    .slice()
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 3);

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
            租赁设备 · 招聘求职 · 二手专区
          </p>
        </div>
      </section>

      {/* ---- 轮播广告 ---- */}
      <section className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
        <Carousel index={adIndex} onChange={setAdIndex} />
      </section>

      {/* ---- 我要找…… + 小搜索 ---- */}
      <section className="mt-5">
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

            {/* 顺风捎带 — 独立 /luggage 页 */}
            <button
              onClick={() => router.push("/luggage")}
              className="h-20 flex flex-col items-center justify-center gap-1 bg-white rounded-2xl shadow-sm border border-sky-100 hover:border-red-300 active:scale-95 transition"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#fb923c1A" }}
              >
                <Plane size={20} style={{ color: "#fb923c" }} />
              </span>
              <span className="text-[11px] font-medium text-gray-700">
                顺风捎带
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ---- 实用信息 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-sky-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">实用信息</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Link
            href="/weather"
            className="flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">🌦️</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">天气预报·金沙萨</div>
              <div className="text-[10px] text-gray-600 truncate">极端天气早知道</div>
            </div>
          </Link>
          <Link
            href="/map"
            className="flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">🗺️</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">商家地图</div>
              <div className="text-[10px] text-gray-600 truncate">内置语音告诉司机地点</div>
            </div>
          </Link>
          <Link
            href="/guides/recharge"
            className="flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">📱</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">手机服务指南</div>
              <div className="text-[10px] text-gray-600 truncate">运营商信息查询</div>
            </div>
          </Link>
          <Link
            href="/guides/first-time"
            className="flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">🧳</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">首次来刚果金</div>
              <div className="text-[10px] text-gray-600 truncate">行李及注意事项</div>
            </div>
          </Link>
          <Link
            href="/guides/construction-french"
            className="flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">👷</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">工地常用法语</div>
              <div className="text-[10px] text-gray-600 truncate">真人发音教学</div>
            </div>
          </Link>
        </div>
      </section>

      {/* ---- 信息发布通道 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-yellow-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">信息发布通道</h2>
        </div>
        <div className="grid grid-cols-6 gap-1 md:gap-3 justify-items-center">
          <PublishCard
            label="求购信息"
            icon={ShoppingCart}
            color="bg-gradient-to-br from-orange-400 to-red-500"
            onClick={() => onOpenForm("purchase")}
          />
          <PublishCard
            label="商家入驻"
            icon={Store}
            color="bg-gradient-to-br from-sky-400 to-blue-500"
            onClick={() => onOpenForm("merchant")}
          />
          <PublishCard
            label="发布招聘"
            icon={Briefcase}
            color="bg-gradient-to-br from-red-400 to-rose-500"
            onClick={() => onOpenForm("hiring")}
          />
          <PublishCard
            label="发布求职"
            icon={UserPlus}
            color="bg-gradient-to-br from-amber-400 to-yellow-500"
            onClick={() => onOpenForm("jobseeker")}
          />
          <PublishCard
            label="二手物品"
            icon={Tag}
            color="bg-gradient-to-br from-teal-400 to-sky-500"
            onClick={() => onOpenForm("secondhand")}
          />
          <PublishCard
            label="顺风捎带"
            icon={Plane}
            color="bg-gradient-to-br from-fuchsia-400 to-rose-500"
            onClick={() => router.push("/luggage")}
          />
        </div>
      </section>

      {/* ---- 热门商家 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">热门商家</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featured.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
          ))}
        </div>
      </section>

      {/* ---- 许愿池专区 ---- */}
      <WishingPoolBanner />

      {/* ---- 微信群入口 ---- */}
      <WeChatGroupBanner />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Carousel                                                           */
/* ------------------------------------------------------------------ */
function Carousel({ index, onChange }: { index: number; onChange: (n: number) => void }) {
  const slide = ads[index];
  const next = () => onChange((index + 1) % ads.length);
  const prev = () => onChange((index - 1 + ads.length) % ads.length);

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

  const darkText = !!slide.darkText;
  const bgGradient = slide.bg ? `bg-gradient-to-r ${slide.bg}` : "";
  const textClass = slide.image ? "text-white" : darkText ? "text-gray-900" : "text-white";
  const subtitleClass = slide.image
    ? "text-white/90"
    : darkText
      ? "text-gray-700"
      : "text-white/90";
  const navBtnClass =
    !slide.image && darkText
      ? "bg-black/15 hover:bg-black/25 text-gray-800"
      : "bg-white/20 hover:bg-white/30 text-white";
  const dotActive = !slide.image && darkText ? "bg-gray-900" : "bg-white";
  const dotInactive = !slide.image && darkText ? "bg-gray-400/60" : "bg-white/60";
  const phoneChipClass = slide.image
    ? "bg-white/25 hover:bg-white/40 text-white"
    : darkText
      ? "bg-white/80 hover:bg-white text-red-700"
      : "bg-white/25 hover:bg-white/40 text-white";

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg min-h-[108px] md:min-h-[128px] ${bgGradient}`}>
      {/* 切换时整块内容一起淡入，图/字同步出现 */}
      <div key={index} className="absolute inset-0 animate-slide-in">
        {slide.image && (
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
        )}

        <div className={`absolute inset-0 flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 ${textClass}`}>
          <span className="text-4xl md:text-5xl shrink-0 drop-shadow">{slide.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-base md:text-xl font-bold leading-snug truncate drop-shadow">{slide.title}</p>
            <p className={`text-xs md:text-sm ${subtitleClass} mt-0.5 leading-snug drop-shadow`}>
              {slide.subtitle}
              {slide.address && (
                <>
                  <span className="mx-1 opacity-60">·</span>
                  <MapPin size={11} className="inline -mt-0.5" /> {slide.address}
                </>
              )}
            </p>
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

        {slide.adTag && (
          <span className="absolute top-1.5 right-2 text-[9px] font-normal text-white/55 tracking-[0.2em] leading-none select-none">
            广告
          </span>
        )}
      </div>

      <button
        onClick={prev}
        aria-label="上一条"
        className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full backdrop-blur flex items-center justify-center ${navBtnClass}`}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={next}
        aria-label="下一条"
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full backdrop-blur flex items-center justify-center ${navBtnClass}`}
      >
        <ChevronRight size={16} />
      </button>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
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
/*  Publish Card                                                       */
/* ------------------------------------------------------------------ */
function PublishCard({
  label,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
    >
      <span
        className={`${color} text-white w-11 h-11 md:w-14 md:h-14 rounded-full shadow-md group-hover:shadow-lg flex items-center justify-center ring-1 ring-white/70 ring-inset`}
      >
        <Icon size={18} strokeWidth={2.2} className="md:w-[22px] md:h-[22px] drop-shadow-sm" />
      </span>
      <span className="text-[10px] md:text-xs font-medium text-gray-700 leading-none whitespace-nowrap">
        {label}
      </span>
    </button>
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

  const filtered = allBusinesses.filter((b) => {
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
      b.intro.toLowerCase().includes(q)
    );
  });

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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{biz.name}</h1>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" />
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

            <button
              onClick={onFocusMap}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-400 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <MapPin size={16} /> 在地图上查看
            </button>

            <div className="mt-5 space-y-3 text-sm">
              <Field
                label="所在区域"
                value={biz.area}
                action={
                  <SpeakButton
                    text={`Je veux aller à cette adresse, ${biz.area}`}
                    cacheKey={`biz-${biz.id}`}
                  />
                }
              />
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
              <Field label="门店/仓库" value={biz.hasStore} />
              <Field label="服务范围" value={biz.serviceScope} />
              <Field label="主营产品或服务" value={biz.mainService} />
              <Field label="商家简介" value={biz.intro} />
            </div>

            <ContactButtons biz={biz} className="mt-5" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  许愿池专区 — 热门商家之后、群聊二维码之前                              */
/* ------------------------------------------------------------------ */
function WishingPoolBanner() {
  return (
    <section className="max-w-4xl mx-auto px-4 mt-8">
      <Link
        href="/demand"
        className="relative block rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 text-white active:scale-[0.99] transition"
      >
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/15" />
        <div className="absolute -bottom-10 -right-6 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute top-8 right-20 w-3 h-3 rounded-full bg-white/40" />
        <div className="absolute bottom-10 left-24 w-2 h-2 rounded-full bg-white/50" />

        <div className="relative flex items-center gap-3 px-4 py-4 md:px-6 md:py-5">
          <span className="text-5xl md:text-6xl drop-shadow shrink-0">🪷</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-lg md:text-xl font-black leading-tight drop-shadow">
                许愿池
              </h3>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-300 text-rose-600 text-[10px] font-black rounded-full shadow">
                <Sparkles size={10} fill="currentColor" /> 新
              </span>
            </div>
            <p className="text-xs md:text-sm text-white/95 leading-snug drop-shadow">
              在刚果金最想要什么？投一颗愿望泡泡，双击给别人愿望助力
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-white/25 backdrop-blur rounded-full text-[11px] md:text-xs font-semibold">
              去许愿 <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  微信群二维码入口                                                     */
/* ------------------------------------------------------------------ */
interface QrMeta {
  ok: boolean;
  fallback: boolean;
  imageUrl: string;
  uploadedAt: string | null;
  version: number;
}

function WeChatGroupBanner() {
  const [meta, setMeta] = useState<QrMeta | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/public/qrcode")
      .then((r) => r.json())
      .then((d) => {
        if (!cancel) setMeta(d);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  const uploadedAt = meta?.uploadedAt ? new Date(meta.uploadedAt) : null;
  const daysSince = uploadedAt
    ? Math.floor((Date.now() - uploadedAt.getTime()) / 86400_000)
    : null;
  const daysLeft = daysSince === null ? null : 7 - daysSince;
  const expired = daysLeft !== null && daysLeft <= 0;
  const expiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 2;

  return (
    <section className="max-w-4xl mx-auto px-4 mt-8 pb-8">
      <div className="rounded-2xl overflow-hidden shadow-md border border-emerald-100 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2.5">
          <QrCode size={16} />
          <span className="text-sm font-bold">加入刚果金华人微信群</span>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="shrink-0 bg-white rounded-xl p-2 shadow-sm border border-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta?.imageUrl ?? "/images/qr/wechat-group.jpg"}
              alt="微信群二维码"
              className="w-36 h-36 md:w-40 md:h-40 object-cover rounded-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/qr/wechat-group.jpg";
              }}
            />
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-sm md:text-base font-semibold text-gray-800">
              扫码入群 · 同城资讯 · 互助 · 顺风捎带
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              商家上新、招聘求职、生活求助、代购代运、
              <br className="hidden sm:block" />
              信息都在群里第一时间同步。
            </p>
            {daysLeft === null ? (
              <p className="text-[11px] text-gray-400 mt-2">
                🛈 二维码每 7 天刷新一次，过期请加管理员补群
              </p>
            ) : expired ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 rounded-full px-2.5 py-1">
                <AlertTriangle size={12} />
                二维码已过期 · 请加管理员微信拉群
              </p>
            ) : expiring ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 rounded-full px-2.5 py-1">
                ⏳ 二维码还有 {daysLeft} 天过期，请尽快扫码
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
                ✅ 二维码有效期剩余 {daysLeft} 天
              </p>
            )}
          </div>
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
        <p>刚果金本地华人商家与生活服务平台</p>
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} 版权所有</p>
      </div>
    </footer>
  );
}
