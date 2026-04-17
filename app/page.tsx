"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Store,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Star,
  UtensilsCrossed,
  ShoppingBag,
  Hotel,
  HeartPulse,
  Briefcase,
  PartyPopper,
  Wrench,
  Users,
  Tag,
  X,
  Megaphone,
  UserPlus,
  UserSearch,
  Recycle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Volume2,
} from "lucide-react";

import {
  type Business,
  type RawSubmission,
  categories,
  coordsForArea,
  submissionToBusiness,
  businesses,
} from "@/lib/businesses";

/* ------------------------------------------------------------------ */
/*  轮播广告位                                                          */
/* ------------------------------------------------------------------ */
interface AdSlide {
  title: string;
  subtitle: string;
  bg: string;       // tailwind gradient
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
/*  表单字段定义                                                        */
/* ------------------------------------------------------------------ */
type FieldType = "text" | "textarea" | "select";
interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

const FORMS: Record<
  "merchant" | "hiring" | "jobseeker" | "secondhand",
  { title: string; fields: FormField[] }
> = {
  merchant: {
    title: "商家入驻申请",
    fields: [
      { name: "name",          label: "商家名称",         type: "text", required: true },
      { name: "contactPerson", label: "联系人",           type: "text", required: true },
      { name: "wechat",        label: "微信号",           type: "text" },
      { name: "phone",         label: "电话 / WhatsApp",  type: "text", required: true },
      { name: "category",      label: "所属分类",         type: "select", required: true,
        options: categories.map((c) => c.label) },
      { name: "subcategory",   label: "子分类",           type: "text", placeholder: "如：中国餐厅、生活用品 …" },
      { name: "area",          label: "所在区域",         type: "text", placeholder: "如：金沙萨 Gombe区" },
      { name: "hasStore",      label: "是否有门店",       type: "select", options: ["有", "无"] },
      { name: "mainService",   label: "主营产品或服务",   type: "textarea", required: true },
      { name: "serviceScope",  label: "服务范围",         type: "textarea" },
      { name: "intro",         label: "商家简介",         type: "textarea" },
    ],
  },
  hiring: {
    title: "招聘信息发布",
    fields: [
      { name: "company",      label: "公司名称",        type: "text", required: true },
      { name: "contactPerson",label: "联系人",          type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
      { name: "area",         label: "工作地点",        type: "text", placeholder: "如：金沙萨、卢本巴希 …" },
      { name: "position",     label: "招聘岗位",        type: "text", required: true },
      { name: "salary",       label: "薪资范围",        type: "text", placeholder: "如：1500-2500 USD/月" },
      { name: "requirement",  label: "岗位要求",        type: "textarea", required: true,
        placeholder: "学历、经验、语言、技能 …" },
      { name: "description",  label: "岗位描述",        type: "textarea" },
    ],
  },
  jobseeker: {
    title: "求职信息发布",
    fields: [
      { name: "name",         label: "姓名",            type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
      { name: "targetPosition",label: "目标岗位",       type: "text", required: true },
      { name: "expectArea",   label: "期望工作地",      type: "text" },
      { name: "expectSalary", label: "期望薪资",        type: "text" },
      { name: "experience",   label: "工作经验",        type: "textarea", required: true },
      { name: "skills",       label: "技能特长",        type: "textarea" },
      { name: "intro",        label: "个人简介",        type: "textarea" },
    ],
  },
  secondhand: {
    title: "二手物品发布",
    fields: [
      { name: "itemName",     label: "物品名称",        type: "text", required: true },
      { name: "category",     label: "类别",            type: "text", placeholder: "家电、家具、车辆、电子产品 …" },
      { name: "condition",    label: "新旧程度",        type: "select",
        options: ["全新", "9成新", "8成新", "7成新", "6成新及以下"] },
      { name: "price",        label: "售价（USD）",      type: "text", required: true },
      { name: "description",  label: "物品描述",        type: "textarea", required: true },
      { name: "area",         label: "所在区域",        type: "text" },
      { name: "contactPerson",label: "联系人",          type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type View = "home" | "category" | "business";
type FormKey = keyof typeof FORMS;

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

  // 记录访问量 — 用 sendBeacon，不占主请求通道，不阻塞首屏
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
    // 等首屏绘制后再发，避免抢带宽
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(send);
    } else {
      setTimeout(send, 200);
    }
  }, []);

  // 拉取审核通过的用户提交（mount + 窗口聚焦 + 60s 轮询；CDN s-maxage=60）
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
        <SubmissionModal
          formKey={formOpen}
          onClose={() => setFormOpen(null)}
        />
      )}
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
  const featured = allBusinesses
    .slice()
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 6);

  return (
    <>
      {/* ---- 顶部横幅（淡蓝 + 黄色五角星点缀） ---- */}
      <section className="relative bg-gradient-to-br from-sky-400 via-sky-500 to-blue-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-4 right-10 w-48 h-48 rounded-full bg-white" />
        </div>
        {/* 黄色五角星（中国国旗元素） */}
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-medium mb-4">
            <MapPin size={14} /> 刚果金 · 金沙萨
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
            刚果金华人生活服务指南
          </h1>
          <p className="font-handwriting text-xl md:text-2xl text-yellow-200 mb-1.5 tracking-wide">
            帮助刚果金华人更快找到本地服务
          </p>
          <p className="text-sm md:text-base text-sky-50 max-w-md mx-auto">
            买商品 · 找餐厅 · 找住宿 · 找服务 · 租赁设备 · 招聘求职 · 二手专区
          </p>
        </div>
      </section>

      {/* ---- 轮播广告位 ---- */}
      <section className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
        <Carousel index={adIndex} onChange={setAdIndex} />
      </section>

      {/* ---- 商家分类：2 行横滑，全部一屏可滑见 ---- */}
      <section className="mt-5">
        <div className="px-4 max-w-4xl mx-auto flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">商家分类</h2>
          <span className="text-xs text-gray-400">{categories.length} 大类</span>
          <span className="ml-auto text-xs text-gray-400">← 左右滑动 →</span>
        </div>
        <div className="overflow-x-auto scrollbar-none pb-2">
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

      {/* ---- 快捷入口：天气 / 地图 / 话费充值 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/weather"
            className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">🌦️</span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-800">金沙萨天气</div>
              <div className="text-[10px] text-gray-500 truncate">24h + 雨预警</div>
            </div>
          </Link>
          <Link
            href="/map"
            className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">🗺️</span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-800">商家地图</div>
              <div className="text-[10px] text-gray-500 truncate">定位 · 图钉</div>
            </div>
          </Link>
          <Link
            href="/guides/recharge"
            className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 active:scale-95 transition"
          >
            <span className="text-2xl leading-none">📱</span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-800">话费充值</div>
              <div className="text-[10px] text-gray-500 truncate">4 家运营商</div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PublishCard
            label="商家入驻"
            sub="加入名录"
            color="bg-gradient-to-br from-sky-400 to-blue-500"
            icon={<Megaphone size={22} />}
            onClick={() => onOpenForm("merchant")}
          />
          <PublishCard
            label="发布招聘"
            sub="找合适人才"
            color="bg-gradient-to-br from-red-400 to-rose-500"
            icon={<UserPlus size={22} />}
            onClick={() => onOpenForm("hiring")}
          />
          <PublishCard
            label="发布求职"
            sub="找心仪工作"
            color="bg-gradient-to-br from-amber-400 to-yellow-500"
            icon={<UserSearch size={22} />}
            onClick={() => onOpenForm("jobseeker")}
          />
          <PublishCard
            label="二手物品"
            sub="转手快出"
            color="bg-gradient-to-br from-teal-400 to-sky-500"
            icon={<Recycle size={22} />}
            onClick={() => onOpenForm("secondhand")}
          />
        </div>
      </section>

      {/* ---- 推荐商家 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">推荐商家</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
          ))}
        </div>
      </section>
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
    <div className={`relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r ${slide.bg}`}>
      <div key={index} className="animate-slide-in flex items-center gap-4 p-5 md:p-7 text-white">
        <span className="text-5xl md:text-6xl shrink-0">{slide.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-lg md:text-2xl font-bold leading-snug">{slide.title}</p>
          <p className="text-sm md:text-base text-white/90 mt-1">{slide.subtitle}</p>
          {(slide.phone || slide.address) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {slide.phone && (
                <a
                  href={`tel:${slide.phone.replace(/\s+/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-sm font-semibold"
                >
                  <Phone size={14} /> {slide.phone}
                </a>
              )}
              {slide.address && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-sm font-medium">
                  <MapPin size={14} /> {slide.address}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 左右切换 */}
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

      {/* 指示器 */}
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
/*  GuideCard — 实用指南卡片                                            */
/* ------------------------------------------------------------------ */
function GuideCard({
  href,
  tag,
  title,
  summary,
  footer,
  badge,
  icon,
}: {
  href: string;
  tag: string;
  title: string;
  summary: string;
  footer: string;
  badge: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col h-full group rounded-2xl overflow-hidden shadow-sm border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all bg-white"
    >
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 text-[11px] md:text-xs font-semibold min-w-0 truncate">
          <span className="shrink-0">{icon}</span> <span className="truncate">{tag}</span>
        </div>
        <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white shrink-0">
          {badge}
        </span>
      </div>
      <div className="p-3 md:p-4 flex-1 flex flex-col">
        <p className="text-sm md:text-base font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {title}
        </p>
        <p className="text-xs md:text-sm text-gray-600 mt-2 line-clamp-3 leading-relaxed">
          {summary}
        </p>
        <div className="mt-auto pt-3 flex items-center justify-between text-[11px] md:text-xs text-gray-500">
          <span className="truncate">{footer}</span>
          <span className="text-emerald-600 font-medium group-hover:underline shrink-0">
            查看 →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Publish Card                                                       */
/* ------------------------------------------------------------------ */
function PublishCard({
  label,
  sub,
  color,
  icon,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative ${color} text-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
    >
      <span className="absolute top-3 right-3 opacity-80">{icon}</span>
      <p className="text-base font-bold">{label}</p>
      <p className="text-xs text-white/85 mt-0.5">{sub}</p>
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
      {/* 顶部条 */}
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

      {/* 搜索 */}
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

      {/* 子分类标签 */}
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

      {/* 列表 */}
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

            {/* 地图按钮（双向查询） */}
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
/*  BusinessCard                                                       */
/* ------------------------------------------------------------------ */
function BusinessCard({ biz, onOpen }: { biz: Business; onOpen?: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categories.find((c) => c.key === biz.category);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden transition-all hover:shadow-md hover:border-red-200">
      <div className="relative h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
        {biz.featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full shadow flex items-center gap-1">
            <Star size={12} fill="white" /> 推荐
          </span>
        )}
        <span className="absolute top-3 right-3 px-2.5 py-1 bg-sky-500 text-white text-xs font-semibold rounded-full shadow">
          {cat?.label}
          {biz.subcategory ? ` · ${biz.subcategory}` : ""}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-lg font-bold text-gray-900 leading-snug">{biz.name}</h3>
          <SpeakButton
            text={`Je veux aller à cette adresse, ${biz.area}`}
            cacheKey={`biz-${biz.id}`}
          />
        </div>

        <div className="mt-3 space-y-2">
          <Row icon={<MapPin size={15} className="text-red-400" />} text={biz.area} />
          <Row icon={<Store size={15} className="text-sky-400" />} text={biz.mainService} clamp />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-sky-600 font-medium hover:text-red-500 transition-colors"
          >
            {expanded ? "收起" : "快速预览"}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {onOpen && (
            <button
              onClick={() => onOpen(biz.id)}
              className="ml-auto flex items-center gap-1 text-sm text-red-500 font-medium hover:text-red-600 transition-colors"
            >
              进入详情页 <ChevronRight size={14} />
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-sky-100 space-y-3 text-sm">
            <Field label="联系人" value={biz.contactPerson} />
            <Field label="微信号" value={biz.wechat} />
            <Field label="电话 / WhatsApp" value={biz.phone} />
            <Field label="门店/仓库" value={biz.hasStore} />
            <Field label="服务范围" value={biz.serviceScope} />
            <Field label="主营产品或服务" value={biz.mainService} />
            <Field label="商家简介" value={biz.intro} />

            <ContactButtons biz={biz} className="pt-2" />
          </div>
        )}
      </div>
    </div>
  );
}

function ContactButtons({ biz, className = "" }: { biz: Business; className?: string }) {
  const hasPhone = !!biz.phone?.trim();
  const hasWechat = !!biz.wechat?.trim();
  if (!hasPhone && !hasWechat) {
    return (
      <p className={`text-sm text-gray-400 italic ${className}`}>
        暂无联系方式 · 请到店咨询
      </p>
    );
  }
  return (
    <div className={`flex gap-2 ${className}`}>
      {hasPhone && (
        <a
          href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-400 text-white text-sm font-semibold rounded-xl hover:bg-red-500 transition-colors"
        >
          <Phone size={14} /> WhatsApp 联系
        </a>
      )}
      {hasWechat && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(biz.wechat);
            alert(`已复制微信号：${biz.wechat}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
        >
          <MessageCircle size={14} /> 复制微信号
        </button>
      )}
    </div>
  );
}

function hashText(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(36);
}

function SpeakButton({ text, cacheKey }: { text: string; cacheKey?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reportError = (stage: string, extra?: unknown) => {
    console.error(`[SpeakButton] ${stage}`, extra);
    alert(
      `法语朗读失败（${stage}）。请检查：\n` +
        `• 网络 / 后端 /api/speak 是否 200\n` +
        `• GEMINI_API_KEY 是否已在 .env.local 配置并重启 dev\n` +
        `• Gemini 配额是否耗尽\n` +
        `（详细错误已打到控制台）`
    );
  };

  const speak = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);

    const fullCacheKey = cacheKey ? `${cacheKey}-${hashText(text)}` : undefined;
    let res: Response;
    try {
      res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, cacheKey: fullCacheKey }),
      });
    } catch (err) {
      setSpeaking(false);
      reportError("网络请求失败", err);
      return;
    }

    if (!res.ok) {
      let detail: unknown = null;
      try {
        detail = await res.json();
      } catch {
        /* ignore */
      }
      setSpeaking(false);
      reportError(`HTTP ${res.status}`, detail);
      return;
    }

    let audioUrl: string;
    let revoke = () => {};
    try {
      const ctype = res.headers.get("Content-Type") ?? "";
      if (ctype.includes("application/json")) {
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("response missing url");
        audioUrl = data.url;
      } else {
        const blob = await res.blob();
        if (!blob.size) throw new Error("empty audio blob");
        audioUrl = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (err) {
      setSpeaking(false);
      reportError("解析响应失败", err);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setSpeaking(false);
      revoke();
    };
    audio.onerror = () => {
      setSpeaking(false);
      revoke();
      reportError("音频解码/播放失败", audio.error);
    };
    try {
      await audio.play();
    } catch (err) {
      setSpeaking(false);
      revoke();
      reportError("audio.play() 被拒", err);
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`法语播报地址：${text}`}
      title={`点击用法语朗读：${text}`}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95 ${
        speaking
          ? "bg-red-100 text-red-500 animate-pulse"
          : "bg-sky-100 text-sky-600 hover:bg-sky-200 active:bg-sky-200"
      }`}
    >
      <Volume2 size={16} />
      <span>法语播报地址</span>
    </button>
  );
}

function Row({ icon, text, clamp }: { icon: React.ReactNode; text: string; clamp?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-600">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={clamp ? "line-clamp-1" : ""}>{text}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const empty = !value || !value.trim();
  return (
    <div>
      <p className="text-gray-400 text-xs tracking-wide mb-0.5">{label}</p>
      <p className={`leading-relaxed ${empty ? "text-gray-400 italic" : "text-gray-700"}`}>
        {empty ? "待补充" : value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Submission Modal                                                   */
/* ------------------------------------------------------------------ */
function SubmissionModal({ formKey, onClose }: { formKey: FormKey; onClose: () => void }) {
  const def = FORMS[formKey];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }));

  const submit = async () => {
    for (const f of def.fields) {
      if (f.required && !values[f.name]?.trim()) {
        setError(`请填写「${f.label}」`);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: formKey, data: values }),
      });
      if (!res.ok) throw new Error("submit failed");
      setDone(true);
    } catch {
      setError("提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">{def.title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-sky-50 flex items-center justify-center"
            aria-label="关闭"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center flex-1">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4 animate-pulse-red">
              <CheckCircle2 size={36} className="text-red-400" />
            </div>
            <p className="text-lg font-bold text-gray-800 mb-1">提交成功</p>
            <p className="text-sm text-gray-500 mb-2">您的信息已进入</p>
            <p className="inline-block px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm font-medium">
              ⏳ 审核中
            </p>
            <p className="text-xs text-gray-400 mt-4">审核通过后会展示在对应分类页面</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl"
            >
              完成
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
              {def.fields.map((f) => (
                <FormFieldInput
                  key={f.name}
                  field={f}
                  value={values[f.name] ?? ""}
                  onChange={(v) => update(f.name, v)}
                />
              ))}
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-sky-100 shrink-0">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-red-400 hover:to-rose-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 提交中…
                  </>
                ) : (
                  "提交申请"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full px-3 py-2.5 bg-sky-50 border border-sky-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={base}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">请选择</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
    </div>
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
