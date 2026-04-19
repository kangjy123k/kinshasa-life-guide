"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  ArrowLeft,
  QrCode,
  AlertTriangle,
} from "lucide-react";

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
  ContactButtons,
  Field,
  SpeakButton,
} from "@/components/BusinessCardUI";
import { SubmissionModal, type FormKey } from "@/components/SubmissionModal";

/* ------------------------------------------------------------------ */
/*  轮播广告位                                                          */
/* ------------------------------------------------------------------ */
interface AdSlide {
  title: string;
  subtitle: string;
  bg: string;
  emoji: string;
  phone?: string;
  address?: string;
}

const ads: AdSlide[] = [
  {
    title: "欢迎商家入驻名录",
    subtitle: "免费收录 · 让客户更快找到你",
    bg: "from-sky-400 via-sky-500 to-blue-500",
    emoji: "🏪",
  },
  {
    title: "混凝土搅拌站",
    subtitle: "工程建材一站供应 · 价格实惠",
    bg: "from-amber-400 via-yellow-400 to-orange-400",
    emoji: "🏗️",
    phone: "+243823170887",
    address: "中国城",
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

  // 从 URL 读 ?biz=<id>（/map 点详情跳过来的），自动打开商家详情页
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("biz");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id)) return;
    setDetailBizId(id);
    setView("business");
    window.history.replaceState({}, "", window.location.pathname);
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
    setView("category");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const openBusiness = (id: number) => {
    setDetailBizId(id);
    setView("business");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
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
          onBack={() => setView("home")}
          onOpenBusiness={openBusiness}
        />
      )}
      {view === "business" && detailBiz && (
        <BusinessDetailView
          biz={detailBiz}
          onBack={() => setView("home")}
          onFocusMap={() => focusOnMap(detailBiz.id)}
          onViewAllMap={() => focusOnMap(null)}
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
    const done = setTimeout(onClose, 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-5 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左上角倒计时指示 */}
        <div
          aria-hidden
          className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-black/25 backdrop-blur flex items-center justify-center text-white font-black shadow ring-2 ring-white/30"
        >
          <span className="text-base leading-none">{remaining > 0 ? remaining : 0}</span>
        </div>
        {/* 右上角手动关闭 */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-white shadow-lg ring-2 ring-white/40 active:scale-95"
        >
          <X size={18} />
        </button>

        <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/15" />
        <div className="absolute bottom-10 -right-8 w-32 h-32 rounded-full bg-white/15" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
          <div className="text-6xl mb-3 drop-shadow">🔊</div>
          <div className="text-2xl font-black leading-snug mb-4 drop-shadow tracking-wide">
            快试试告诉司机<br />你要去哪儿吧！
          </div>
          <div className="text-sm font-semibold opacity-95 mb-3">
            商家线下地址
          </div>
          <div className="inline-block px-4 py-1.5 bg-white text-rose-600 rounded-full text-sm font-black shadow">
            法语语音播报 · 上线
          </div>
        </div>
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
    .slice(0, 6);

  const [homeQuery, setHomeQuery] = useState("");
  const [utilExpanded, setUtilExpanded] = useState(false);

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
          <button
            onClick={() => setUtilExpanded((v) => !v)}
            className="ml-auto text-xs text-sky-600 font-medium flex items-center gap-0.5"
          >
            {utilExpanded ? (
              <>收起 <ChevronUp size={12} /></>
            ) : (
              <>更多 <ChevronDown size={12} /></>
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            className={`flex items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition ${utilExpanded ? "" : "hidden md:flex"}`}
          >
            <span className="text-2xl leading-none">📱</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">手机服务指南</div>
              <div className="text-[10px] text-gray-600 truncate">运营商信息查询</div>
            </div>
          </Link>
          <Link
            href="/demand"
            className={`relative items-center gap-2 p-3 rounded-2xl bg-sky-100 border border-sky-200 text-gray-800 active:scale-95 transition ${utilExpanded ? "flex" : "hidden md:flex"}`}
          >
            <span className="text-2xl leading-none">🪷</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">许愿池</div>
              <div className="text-[10px] text-gray-600 truncate">在刚果金最想要什么？</div>
            </div>
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-black bg-yellow-300 text-rose-600 rounded-full shadow">
              新
            </span>
          </Link>
        </div>
      </section>

      {/* ---- 信息发布通道 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-yellow-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">信息发布通道</h2>
        </div>
        <div className="grid grid-cols-5 gap-1.5 md:gap-3">
          <PublishCard
            label="顺风捎带"
            color="bg-gradient-to-br from-orange-400 to-rose-500"
            onClick={() => router.push("/luggage")}
          />
          <PublishCard
            label="商家入驻"
            color="bg-gradient-to-br from-sky-400 to-blue-500"
            onClick={() => onOpenForm("merchant")}
          />
          <PublishCard
            label="发布招聘"
            color="bg-gradient-to-br from-red-400 to-rose-500"
            onClick={() => onOpenForm("hiring")}
          />
          <PublishCard
            label="发布求职"
            color="bg-gradient-to-br from-amber-400 to-yellow-500"
            onClick={() => onOpenForm("jobseeker")}
          />
          <PublishCard
            label="二手物品"
            color="bg-gradient-to-br from-teal-400 to-sky-500"
            onClick={() => onOpenForm("secondhand")}
          />
        </div>
      </section>

      {/* ---- 热门商家 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">热门商家</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
          ))}
        </div>
      </section>

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

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r ${slide.bg} min-h-[108px] md:min-h-[128px]`}>
      <div key={index} className="animate-slide-in absolute inset-0 flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 text-white">
        <span className="text-4xl md:text-5xl shrink-0">{slide.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-base md:text-xl font-bold leading-snug truncate">{slide.title}</p>
          <p className="text-xs md:text-sm text-white/90 mt-0.5 leading-snug">
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
              className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-xs md:text-sm font-semibold"
            >
              <Phone size={12} /> {slide.phone}
            </a>
          )}
        </div>
      </div>

      <button
        onClick={prev}
        aria-label="上一条"
        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={next}
        aria-label="下一条"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white"
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
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
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
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  const top = label.slice(0, 2);
  const bottom = label.slice(2, 4);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`${color} text-white aspect-square rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center font-black leading-tight ring-[3px] ring-white/40 ring-inset`}
    >
      <span className="text-sm md:text-xl tracking-wider">{top}</span>
      <span className="text-sm md:text-xl tracking-wider mt-0.5">{bottom}</span>
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
    if (activeSub !== "全部" && b.subcategory !== activeSub) return false;
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
  onViewAllMap,
}: {
  biz: Business;
  onBack: () => void;
  onFocusMap: () => void;
  onViewAllMap: () => void;
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
                <Star size={12} fill="white" /> 推荐
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-start gap-2">
              <h2 className="flex-1 text-xl font-bold text-gray-900">{biz.name}</h2>
              <SpeakButton
                text={`Je veux aller à cette adresse, ${biz.area}`}
                cacheKey={`biz-${biz.id}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onFocusMap}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-red-400 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <MapPin size={16} /> 在地图上查看
              </button>
              <button
                onClick={onViewAllMap}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                🗺️ 查看全部地图
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <Field label="所在区域" value={biz.area} />
              <Field label="联系人" value={biz.contactPerson} />
              <Field label="微信号" value={biz.wechat} />
              <Field label="电话 / WhatsApp" value={biz.phone} />
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
