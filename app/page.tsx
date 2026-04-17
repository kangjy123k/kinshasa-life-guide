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
  Plane,
  Package,
  Calendar,
  TrendingUp,
  Flame,
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
  "merchant" | "hiring" | "jobseeker" | "secondhand" | "luggage",
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
  luggage: {
    title: "✈️ 发布捎带 · 顺路变现",
    fields: [
      { name: "direction",      label: "方向",            type: "select", required: true,
        options: ["回国 🇨🇩 → 🇨🇳", "来刚 🇨🇳 → 🇨🇩"] },
      { name: "name",           label: "姓名",            type: "text", required: true },
      { name: "phone",          label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",         label: "微信号",          type: "text" },
      { name: "fromCity",       label: "出发城市",        type: "text", required: true, placeholder: "金沙萨 / 广州 / 上海 …" },
      { name: "toCity",         label: "抵达城市",        type: "text", required: true, placeholder: "广州 / 香港 / 金沙萨 …" },
      { name: "departureDate",  label: "出发日期",        type: "text", required: true, placeholder: "2026-05-01" },
      { name: "availableWeight",label: "可带重量 (kg)",   type: "text", required: true, placeholder: "例：10" },
      { name: "price",          label: "💰 报价 / 运费",  type: "text", placeholder: "例：5 USD/kg · 小件免费 · 面议" },
      { name: "goodsType",      label: "可捎带物品类型",  type: "textarea", placeholder: "文件、药品、零食、化妆品、小电子产品 …" },
      { name: "restrictions",   label: "不可带物品",      type: "textarea", placeholder: "液体、刀具、仿牌、违禁品 …" },
      { name: "remark",         label: "补充说明",        type: "textarea", placeholder: "联系时段、交接方式、落地后回程等" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  行李代运数据                                                         */
/* ------------------------------------------------------------------ */
type LuggageDir = "home" | "congo";
interface LuggageRecord {
  id: string;
  direction: LuggageDir;
  name: string;
  phone: string;
  wechat: string;
  fromCity: string;
  toCity: string;
  departureDate: string;
  availableWeight: string;
  price: string;
  goodsType: string;
  restrictions: string;
  remark: string;
  timestamp: string;
}

function rawToLuggage(r: RawSubmission): LuggageRecord | null {
  if (r.type !== "luggage") return null;
  const d = r.data || {};
  const dir = (d.direction ?? "").trim();
  const direction: LuggageDir = dir.includes("回国") || dir.startsWith("回") ? "home" : "congo";
  return {
    id: r.id,
    direction,
    name: d.name ?? "",
    phone: d.phone ?? "",
    wechat: d.wechat ?? "",
    fromCity: d.fromCity ?? "",
    toCity: d.toCity ?? "",
    departureDate: d.departureDate ?? "",
    availableWeight: d.availableWeight ?? "",
    price: d.price ?? "",
    goodsType: d.goodsType ?? "",
    restrictions: d.restrictions ?? "",
    remark: d.remark ?? "",
    timestamp: r.timestamp,
  };
}

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
  const [luggageRecords, setLuggageRecords] = useState<LuggageRecord[]>([]);
  const [detailBizId, setDetailBizId] = useState<number | null>(null);

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
    // 清理 URL，浏览器后退直接回上一页而不是又触发一次
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

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
          const items: Business[] = [];
          const luggage: LuggageRecord[] = [];
          records.forEach((r, i) => {
            if (r.type === "luggage") {
              const lr = rawToLuggage(r);
              if (lr) luggage.push(lr);
            } else {
              const b = submissionToBusiness(r, i);
              if (b) items.push(b);
            }
          });
          setApprovedExtras(items);
          setLuggageRecords(luggage);
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
          luggageRecords={luggageRecords}
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
  luggageRecords,
  onOpenCategory,
  adIndex,
  setAdIndex,
  onOpenForm,
  onOpenBusiness,
}: {
  businesses: Business[];
  luggageRecords: LuggageRecord[];
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

  // 分类区搜索
  const [homeQuery, setHomeQuery] = useState("");
  const searchResults = useMemo(() => {
    const q = homeQuery.trim().toLowerCase();
    if (!q) return [];
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
      .slice(0, 40);
  }, [allBusinesses, homeQuery]);
  const showResults = homeQuery.trim().length > 0;

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

      {/* ---- 商家分类 + 搜索 ---- */}
      <section className="mt-5">
        <div className="px-4 max-w-4xl mx-auto flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">商家分类</h2>
          <span className="text-xs text-gray-400">{categories.length} 大类</span>
          {!showResults && (
            <span className="ml-auto text-xs text-gray-400">← 左右滑动 →</span>
          )}
        </div>

        {/* 搜索框 */}
        <div className="px-4 max-w-4xl mx-auto mb-3">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-sky-100 shadow-sm focus-within:border-red-300">
            <Search size={18} className="text-sky-400 shrink-0" />
            <input
              value={homeQuery}
              onChange={(e) => setHomeQuery(e.target.value)}
              placeholder="搜索商家 · 菜品 · 服务 · 区域…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            {homeQuery && (
              <button onClick={() => setHomeQuery("")} aria-label="清空" className="shrink-0">
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
          {showResults && (
            <p className="text-xs text-gray-500 mt-2">
              {searchResults.length > 0
                ? `共找到 ${searchResults.length} 条匹配`
                : "没找到匹配结果，试试其他关键词"}
            </p>
          )}
        </div>

        {/* 有搜索词 → 显示结果；无 → 显示分类图标 */}
        {showResults ? (
          <div className="max-w-4xl mx-auto px-4 pb-2">
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((biz) => (
                  <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
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
        )}
      </section>

      {/* ---- 快捷入口：天气 / 地图 / 充值 / 需求榜 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
          <Link
            href="/demand"
            className="relative flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-sky-600 via-cyan-500 to-teal-500 text-white shadow active:scale-95 transition"
          >
            <span className="text-2xl leading-none">🪷</span>
            <div className="min-w-0">
              <div className="text-xs font-bold">许愿池</div>
              <div className="text-[10px] text-white/90 truncate">拨水泡·双击许愿</div>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <PublishCard
            label="顺风捎带"
            sub="可盈利 💰"
            color="bg-gradient-to-br from-orange-400 to-rose-500"
            icon={<Plane size={22} />}
            onClick={() => onOpenForm("luggage")}
            badge="热"
          />
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

      {/* ---- 行李代运（中刚往返捎带） ---- */}
      <LuggageBoard records={luggageRecords} onOpenForm={() => onOpenForm("luggage")} />

      {/* ---- 推荐商家 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8 pb-4">
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
  badge,
}: {
  label: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative ${color} text-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
    >
      <span className="absolute top-3 right-3 opacity-80">{icon}</span>
      {badge && (
        <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 text-[10px] font-black bg-yellow-300 text-rose-600 rounded-full shadow">
          {badge}
        </span>
      )}
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
/*  LuggageBoard — 中刚往返行李捎带                                      */
/* ------------------------------------------------------------------ */
function LuggageBoard({
  records,
  onOpenForm,
}: {
  records: LuggageRecord[];
  onOpenForm: () => void;
}) {
  const [tab, setTab] = useState<LuggageDir>("home");

  const sorted = useMemo(() => {
    const now = Date.now();
    return [...records]
      .filter((r) => r.direction === tab)
      .sort((a, b) => {
        const ta = Date.parse(a.departureDate);
        const tb = Date.parse(b.departureDate);
        const va = Number.isFinite(ta) ? ta : Date.parse(a.timestamp);
        const vb = Number.isFinite(tb) ? tb : Date.parse(b.timestamp);
        // 未出发的按日期升序；已过期沉底
        const fa = va < now ? va + 1e13 : va;
        const fb = vb < now ? vb + 1e13 : vb;
        return fa - fb;
      });
  }, [records, tab]);

  const homeCount = records.filter((r) => r.direction === "home").length;
  const congoCount = records.filter((r) => r.direction === "congo").length;

  return (
    <section className="max-w-4xl mx-auto px-4 mt-8">
      {/* 营销横幅 */}
      <div className="relative rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white p-4 md:p-5">
        <div className="absolute -right-4 -bottom-4 opacity-20">
          <Plane size={120} />
        </div>
        <div className="relative flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center">
            <Package size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-black leading-snug">
              📦 顺风捎带 · 中刚往返
            </h2>
            <p className="font-handwriting text-base md:text-lg text-yellow-100 mt-0.5">
              出门不空行李 · 每公斤都能变现
            </p>
            <p className="text-xs md:text-sm text-white/90 mt-1.5 leading-snug">
              <Flame size={13} className="inline -mt-0.5" /> 每月 2 次回国？
              发一次接一次单 · 托运余额 = 零花钱
            </p>
          </div>
        </div>
        <button
          onClick={onOpenForm}
          className="relative mt-4 w-full md:w-auto md:inline-flex flex items-center justify-center gap-2 px-5 py-3 bg-white text-orange-600 text-sm font-bold rounded-xl shadow hover:shadow-lg hover:bg-orange-50 transition active:scale-95"
        >
          <TrendingUp size={16} />
          发布捎带 · 免费接单
          <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-semibold">💰 可盈利</span>
        </button>
      </div>

      {/* 方向 Tab */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setTab("home")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "home"
              ? "bg-red-400 text-white shadow"
              : "bg-white text-gray-600 border border-sky-100"
          }`}
        >
          🇨🇩→🇨🇳 回中国
          <span className={`px-1.5 rounded-full text-xs ${tab === "home" ? "bg-white/25" : "bg-sky-50 text-gray-500"}`}>
            {homeCount}
          </span>
        </button>
        <button
          onClick={() => setTab("congo")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "congo"
              ? "bg-sky-500 text-white shadow"
              : "bg-white text-gray-600 border border-sky-100"
          }`}
        >
          🇨🇳→🇨🇩 来刚果金
          <span className={`px-1.5 rounded-full text-xs ${tab === "congo" ? "bg-white/25" : "bg-sky-50 text-gray-500"}`}>
            {congoCount}
          </span>
        </button>
      </div>

      {/* 列表 */}
      <div className="mt-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 py-8 text-center">
            <Package size={32} className="mx-auto text-orange-300 mb-2" />
            <p className="text-sm text-gray-500 mb-1">暂无捎带信息</p>
            <p className="text-xs text-gray-400 mb-3">
              第一个发布，抢占本方向曝光 · 排名置顶
            </p>
            <button
              onClick={onOpenForm}
              className="text-xs font-semibold text-orange-600 underline"
            >
              立即发布捎带 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((r) => (
              <LuggageCard key={r.id} rec={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LuggageCard({ rec }: { rec: LuggageRecord }) {
  const dirColor =
    rec.direction === "home"
      ? "from-red-400 to-rose-500"
      : "from-sky-500 to-blue-500";
  const dirLabel =
    rec.direction === "home" ? "🇨🇩 → 🇨🇳 回国" : "🇨🇳 → 🇨🇩 来刚";

  const depMs = Date.parse(rec.departureDate);
  const daysToGo = Number.isFinite(depMs)
    ? Math.ceil((depMs - Date.now()) / 86400_000)
    : null;
  const countdown =
    daysToGo === null
      ? ""
      : daysToGo > 0
        ? `距出发 ${daysToGo} 天`
        : daysToGo === 0
          ? "今天出发"
          : `已出发 ${-daysToGo} 天`;

  const hasPhone = !!rec.phone.trim();
  const hasWechat = !!rec.wechat.trim();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden active:scale-[0.99] transition">
      {/* header */}
      <div className={`bg-gradient-to-r ${dirColor} px-4 py-2.5 text-white flex items-center justify-between`}>
        <span className="text-sm font-bold">{dirLabel}</span>
        <span className="text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
          <Calendar size={11} />
          {rec.departureDate || "日期待定"}
          {countdown && <span className="opacity-80">· {countdown}</span>}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="truncate">{rec.fromCity || "—"}</span>
          <Plane size={16} className="text-orange-400 shrink-0" />
          <span className="truncate">{rec.toCity || "—"}</span>
        </div>

        {/* 重量 / 报价 突出块 */}
        <div className="flex items-stretch gap-2">
          <div className="flex-1 rounded-xl bg-orange-50 border border-orange-100 p-2.5">
            <p className="text-[10px] text-orange-500 font-medium">可带重量</p>
            <p className="text-lg font-black text-orange-600 leading-tight">
              {rec.availableWeight ? `${rec.availableWeight} kg` : "—"}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-yellow-50 border border-yellow-100 p-2.5">
            <p className="text-[10px] text-yellow-700 font-medium">💰 报价</p>
            <p className="text-sm font-bold text-yellow-800 leading-tight break-words">
              {rec.price?.trim() || "面议"}
            </p>
          </div>
        </div>

        {rec.goodsType && (
          <div className="text-xs text-gray-600 bg-sky-50 rounded-lg px-2.5 py-1.5">
            <span className="text-sky-500 font-semibold">可带：</span>
            <span className="break-words">{rec.goodsType}</span>
          </div>
        )}
        {rec.restrictions && (
          <div className="text-xs text-gray-500 break-words">
            <span className="text-red-400 font-semibold">禁带：</span>
            {rec.restrictions}
          </div>
        )}
        {rec.remark && (
          <p className="text-xs text-gray-500 break-words">{rec.remark}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-gray-500 truncate">
            👤 <span className="font-medium text-gray-700">{rec.name || "匿名"}</span>
          </p>
          <div className="flex gap-2 shrink-0">
            {hasPhone && (
              <a
                href={`https://wa.me/${rec.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-red-400 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
              >
                <Phone size={12} /> WhatsApp
              </a>
            )}
            {hasWechat && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rec.wechat);
                  alert(`已复制微信号：${rec.wechat}`);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg"
              >
                <MessageCircle size={12} /> 微信
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
