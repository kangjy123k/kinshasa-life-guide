"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Lock,
  Loader2,
  RefreshCw,
  Megaphone,
  Recycle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  LogOut,
  ShoppingCart,
  ClipboardList,
  CalendarHeart,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { AdminFwodPanel } from "@/components/AdminFwodPanel";

type SubmissionType =
  | "merchant"
  | "secondhand"
  | "purchase"
  | "survey"
  | "event";
type Status = "pending" | "approved" | "rejected";

interface SubmissionRecord {
  id: string;
  type: SubmissionType;
  timestamp: string;
  status: Status;
  data: Record<string, string>;
}

const TYPE_META: Record<SubmissionType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  merchant:   { label: "商家入驻", icon: Megaphone,    color: "bg-sky-500" },
  secondhand: { label: "二手物品", icon: Recycle,      color: "bg-teal-500" },
  purchase:   { label: "求购信息", icon: ShoppingCart, color: "bg-red-500" },
  survey:     { label: "问卷调研", icon: ClipboardList,color: "bg-indigo-500" },
  event:      { label: "线下活动", icon: CalendarHeart,color: "bg-violet-500" },
};

const STATUS_META: Record<Status, { label: string; cls: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  pending:  { label: "审核中", cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "已通过", cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  rejected: { label: "已拒绝", cls: "bg-red-100 text-red-600",      icon: XCircle },
};

// 字段 key → 中文标签；与表单 label 对齐。unknown key 回落到原始 key。
const FIELD_LABELS: Record<string, string> = {
  // merchant
  nameZh: "商家中文名称",
  nameIntl: "商家外文名称",
  contactPerson: "联系人称呼",
  phone: "联系人电话/WhatsApp",
  wechat: "联系人微信号",
  category: "所属分类",
  subcategory: "子分类",
  hasStore: "是否有门店",
  storeAddress: "具体地址（法语）",
  storeLocationLat: "地图定位 · 纬度",
  storeLocationLng: "地图定位 · 经度",
  area: "所在区域",
  mainService: "主营产品或服务介绍",
  coverImageUrl: "页面首图",
  galleryUrls: "相册",
  latestUpdateText: "最新动态",
  latestUpdateImages: "最新动态配图",
  // purchase
  itemName: "物品名称",
  quantity: "数量",
  description: "描述",
  budget: "预算区间",
  deadline: "最晚收货时间",
  paymentMethod: "付费方式",
  // secondhand
  categoryKey: "物品类别",
  condition: "新旧程度",
  price: "售价",
  address: "地址",
  // survey
  surveyTitle: "调研主题",
  surveyIntro: "调研说明",
  surveyReward: "调研奖励",
  surveyLink: "调研链接",
  // event
  eventName: "活动名称",
  organizer: "主办方",
  eventDate: "活动日期",
  eventVenue: "活动场地",
  eventDescription: "活动描述",
  participantCountMin: "人数下限",
  participantCountMax: "人数上限",
  // common contact aliases
  contact_phone: "电话/WhatsApp",
  contact_whatsapp: "WhatsApp",
  contact_wechat: "微信号",
  contact_email: "邮箱",
};

const PASSWORD_KEY = "kinshasa_admin_pw";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SubmissionRecord[]>([]);
  const [activeType, setActiveType] = useState<SubmissionType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<Status | "all">("all");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [fwodOpen, setFwodOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"created" | "activity">("created");

  // 自动尝试读已存密码
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(PASSWORD_KEY);
    if (saved) {
      setPassword(saved);
      tryLoad(saved);
    }
  }, []);

  async function tryLoad(pw: string) {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/submissions", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        setAuthError("密码错误");
        sessionStorage.removeItem(PASSWORD_KEY);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { records: SubmissionRecord[] };
      setRecords(data.records);
      setAuthed(true);
      sessionStorage.setItem(PASSWORD_KEY, pw);
    } catch {
      setAuthError("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  function markUpdating(id: string, on: boolean) {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function updateStatus(id: string, status: Status) {
    markUpdating(id, true);
    // 乐观更新：立即在 UI 中反映新状态
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch("/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("update failed");
      await tryLoad(password);
    } catch {
      alert("操作失败，请重试");
      await tryLoad(password); // 回滚到服务器真实状态
    } finally {
      markUpdating(id, false);
    }
  }

  async function removeRecord(id: string) {
    if (!confirm("确认删除该条记录？此操作不可恢复。")) return;
    markUpdating(id, true);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch("/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, action: "delete" }),
      });
      if (!res.ok) throw new Error("delete failed");
      await tryLoad(password);
    } catch {
      alert("删除失败，请重试");
      await tryLoad(password);
    } finally {
      markUpdating(id, false);
    }
  }

  function logout() {
    sessionStorage.removeItem(PASSWORD_KEY);
    setPassword("");
    setAuthed(false);
    setRecords([]);
  }

  const counts = useMemo(() => {
    const c: Record<SubmissionType | "all", number> = {
      all: records.length,
      merchant: 0,
      secondhand: 0,
      purchase: 0,
      survey: 0,
      event: 0,
    };
    for (const r of records) c[r.type]++;
    return c;
  }, [records]);

  const pendingCount = records.filter((r) => r.status === "pending").length;

  // 取 record 最近一次活动时间：商家若有动态，取最新动态的 at；否则回落到 timestamp
  const activityTime = (r: SubmissionRecord): number => {
    const created = new Date(r.timestamp).getTime() || 0;
    const raw = r.data?.updates;
    if (!raw) return created;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let latest = 0;
        for (const u of parsed) {
          const t = new Date(u?.at ?? "").getTime();
          if (Number.isFinite(t) && t > latest) latest = t;
        }
        return Math.max(created, latest);
      }
    } catch {
      /* ignore */
    }
    return created;
  };

  const visible = records
    .filter((r) => {
      if (activeType !== "all" && r.type !== activeType) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const pick = (r: SubmissionRecord) =>
        sortMode === "activity" ? activityTime(r) : new Date(r.timestamp).getTime() || 0;
      return pick(b) - pick(a);
    });

  /* ---------- 登录页 ---------- */
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-sky-100">
          <div className="flex flex-col items-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mb-3">
              <Lock size={26} className="text-sky-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">管理员登录</h1>
            <p className="text-xs text-gray-500 mt-1">查看并审核用户提交的信息</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryLoad(password)}
            placeholder="请输入管理员密码"
            className="w-full px-3 py-2.5 bg-sky-50 border border-sky-100 rounded-xl text-sm focus:outline-none focus:border-sky-400 focus:bg-white"
          />

          {authError && (
            <p className="text-sm text-red-500 mt-3">{authError}</p>
          )}

          <button
            onClick={() => tryLoad(password)}
            disabled={loading || !password.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            进入后台
          </button>
        </div>
      </div>
    );
  }

  /* ---------- 主体 ---------- */
  return (
    <div className="min-h-screen bg-sky-50">
      {/* 顶栏 */}
      <header className="bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">管理员后台</h1>
            <p className="text-xs text-white/85">
              共 {records.length} 条提交 · 待审核 {pendingCount} 条
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tryLoad(password)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-sm rounded-lg"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              刷新
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-sm rounded-lg"
            >
              <LogOut size={14} /> 退出
            </button>
          </div>
        </div>
      </header>

      {/* 每日法语上传区（与下方审核区视觉明显区分）— 直接在当前页操作 */}
      <section className="max-w-6xl mx-auto px-4 pt-4">
        <div className="rounded-2xl shadow-md overflow-hidden border-2 border-rose-200 bg-rose-50/50">
          <button
            onClick={() => setFwodOpen((v) => !v)}
            className="group relative w-full text-left bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white active:scale-[0.997] transition"
            aria-expanded={fwodOpen}
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/15 pointer-events-none" />
            <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative flex items-center gap-3 px-5 py-4">
              <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 text-2xl">
                🇫🇷
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold drop-shadow">每日法语一词 · 上传</h2>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/25 rounded-full text-[10px] font-bold">
                    <Sparkles size={10} fill="currentColor" /> 独立区
                  </span>
                </div>
                <p className="text-xs text-white/90 mt-0.5 leading-snug">
                  {fwodOpen
                    ? "填好下方表单保存即上线，与用户提交审核互不影响"
                    : "点击展开：上传今日单词、释义图片、近似读音，立即上线前台"}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-white text-rose-600 rounded-full text-xs font-bold shadow group-hover:scale-105 transition">
                {fwodOpen ? (
                  <>
                    收起 <ChevronUp size={13} />
                  </>
                ) : (
                  <>
                    展开 <ChevronDown size={13} />
                  </>
                )}
              </span>
            </div>
          </button>
          {fwodOpen && (
            <div className="p-4 border-t border-rose-100 bg-rose-50/30">
              <AdminFwodPanel password={password} />
            </div>
          )}
        </div>
      </section>

      {/* 类型 tab */}
      <div className="bg-white border-b border-sky-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2">
          <TypeTab
            label="全部"
            count={counts.all}
            active={activeType === "all"}
            onClick={() => setActiveType("all")}
          />
          {(Object.keys(TYPE_META) as SubmissionType[]).map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeType === t
                    ? `${meta.color} text-white shadow-sm`
                    : "bg-sky-50 text-gray-600 hover:bg-sky-100"
                }`}
              >
                <Icon size={14} />
                {meta.label}
                <span className={`ml-0.5 px-1.5 rounded-full text-xs ${
                  activeType === t ? "bg-white/25" : "bg-white text-gray-500"
                }`}>
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-wrap gap-2 items-center">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                activeStatus === s
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "所有状态" : STATUS_META[s].label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-500">
            <span className="hidden sm:inline">排序：</span>
            {([
              ["created", "创建时间"],
              ["activity", "最近活动"],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setSortMode(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  sortMode === m
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                }`}
                aria-pressed={sortMode === m}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
      </div>

      {/* 列表 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {visible.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            暂无符合条件的提交
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((r) => (
              <SubmissionCard
                key={r.id}
                record={r}
                updating={updatingIds.has(r.id)}
                onApprove={() => updateStatus(r.id, "approved")}
                onReject={() => updateStatus(r.id, "rejected")}
                onPending={() => updateStatus(r.id, "pending")}
                onDelete={() => removeRecord(r.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TypeTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active ? "bg-gray-800 text-white shadow-sm" : "bg-sky-50 text-gray-600 hover:bg-sky-100"
      }`}
    >
      {label}
      <span className={`ml-0.5 px-1.5 rounded-full text-xs ${
        active ? "bg-white/25" : "bg-white text-gray-500"
      }`}>
        {count}
      </span>
    </button>
  );
}

function SubmissionCard({
  record,
  updating,
  onApprove,
  onReject,
  onPending,
  onDelete,
}: {
  record: SubmissionRecord;
  updating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onPending: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[record.type];
  const status = STATUS_META[record.status];
  const Icon = meta.icon;
  const StatusIcon = status.icon;

  const time = new Date(record.timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sky-50">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 rounded-lg ${meta.color} text-white flex items-center justify-center`}>
            <Icon size={14} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
            <p className="text-xs text-gray-400">{time}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
          <StatusIcon size={12} />
          {status.label}
        </span>
      </div>

      <div className="px-4 py-3 space-y-1.5 max-h-72 overflow-y-auto">
        {Object.entries(record.data).map(([k, v]) => (
          v ? (
            <div key={k} className="text-sm">
              <span className="text-gray-400 mr-1.5">{FIELD_LABELS[k] ?? k}:</span>
              <span className="text-gray-700 break-words">{v}</span>
            </div>
          ) : null
        ))}
      </div>

      <div className="px-4 py-3 border-t border-sky-50 flex flex-wrap items-center gap-2">
        {updating && (
          <span className="flex items-center gap-1 text-xs text-sky-500 mr-1">
            <Loader2 size={13} className="animate-spin" /> 同步中…
          </span>
        )}
        {record.status !== "approved" && (
          <button
            onClick={onApprove}
            disabled={updating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg"
          >
            <CheckCircle2 size={13} /> 通过
          </button>
        )}
        {record.status !== "rejected" && (
          <button
            onClick={onReject}
            disabled={updating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg"
          >
            <XCircle size={13} /> 拒绝
          </button>
        )}
        {record.status !== "pending" && (
          <button
            onClick={onPending}
            disabled={updating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg"
          >
            <Clock size={13} /> 设为审核中
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={updating}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 rounded-lg"
        >
          <Trash2 size={13} /> 删除
        </button>
      </div>
    </div>
  );
}

