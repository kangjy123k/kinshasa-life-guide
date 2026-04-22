"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Lock,
  Loader2,
  RefreshCw,
  Megaphone,
  UserPlus,
  UserSearch,
  Recycle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  LogOut,
  QrCode,
  Upload,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";

type SubmissionType =
  | "merchant"
  | "hiring"
  | "jobseeker"
  | "secondhand"
  | "purchase"
  | "survey";
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
  hiring:     { label: "招聘",     icon: UserPlus,     color: "bg-red-400" },
  jobseeker:  { label: "求职",     icon: UserSearch,   color: "bg-amber-400" },
  secondhand: { label: "二手物品", icon: Recycle,      color: "bg-teal-500" },
  purchase:   { label: "求购信息", icon: ShoppingCart, color: "bg-red-500" },
  survey:     { label: "问卷调研", icon: ClipboardList,color: "bg-indigo-500" },
};

const STATUS_META: Record<Status, { label: string; cls: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  pending:  { label: "审核中", cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "已通过", cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  rejected: { label: "已拒绝", cls: "bg-red-100 text-red-600",      icon: XCircle },
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
      hiring: 0,
      jobseeker: 0,
      secondhand: 0,
      purchase: 0,
      survey: 0,
    };
    for (const r of records) c[r.type]++;
    return c;
  }, [records]);

  const pendingCount = records.filter((r) => r.status === "pending").length;

  const visible = records.filter((r) => {
    if (activeType !== "all" && r.type !== activeType) return false;
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    return true;
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

      {/* 微信群二维码管理 */}
      <QrCodeManager password={password} />

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
        <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
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
              <span className="text-gray-400 mr-1.5">{k}:</span>
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

/* ------------------------------------------------------------------ */
/*  微信群二维码管理                                                     */
/* ------------------------------------------------------------------ */
interface QrConfig {
  uploadedAt: string | null;
  version: number;
  sourceUrl: string | null;
  lastFetchedAt: string | null;
  lastFetchError: string | null;
}

function QrCodeManager({ password }: { password: string }) {
  const [cfg, setCfg] = useState<QrConfig | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/qrcode", {
        headers: { "x-admin-password": password },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { config: QrConfig };
      setCfg(data.config);
      setUrlInput(data.config.sourceUrl ?? "");
    } catch {
      setMsg("加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    if (file.size > 400_000) {
      alert(`图片过大（${Math.round(file.size / 1024)} KB），请压缩到 400 KB 以内`);
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/qrcode", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "上传失败");
      }
      setMsg("✅ 上传成功，有效期已刷新");
      await refresh();
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : "上传失败"}`);
    } finally {
      setUploading(false);
    }
  }

  async function saveSource() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ action: "set-source", sourceUrl: urlInput.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "保存失败");
      }
      const data = (await res.json()) as { refresh?: { refreshed: boolean; reason?: string } };
      setMsg(
        urlInput.trim()
          ? data.refresh?.refreshed
            ? "✅ 活码 URL 已保存，首次抓取成功"
            : `⚠️ 活码 URL 已保存，但抓取未成功：${data.refresh?.reason ?? "未知"}`
          : "已清空活码 URL"
      );
      await refresh();
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : "保存失败"}`);
    } finally {
      setSaving(false);
    }
  }

  async function manualRefresh() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = (await res.json()) as { refresh?: { refreshed: boolean; reason?: string } };
      if (data.refresh?.refreshed) {
        setMsg("✅ 手动拉取成功");
      } else {
        setMsg(`⚠️ 未更新：${data.refresh?.reason ?? "未知"}`);
      }
      await refresh();
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : "刷新失败"}`);
    } finally {
      setSaving(false);
    }
  }

  const uploadedAt = cfg?.uploadedAt ? new Date(cfg.uploadedAt) : null;
  const daysSince = uploadedAt
    ? Math.floor((Date.now() - uploadedAt.getTime()) / 86400_000)
    : null;
  const daysLeft = daysSince === null ? null : 7 - daysSince;
  const expired = daysLeft !== null && daysLeft <= 0;
  const expiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 2;
  const hasImage = !!cfg?.uploadedAt;

  const statusBlock = () => {
    if (!hasImage) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
          🛈 尚未有二维码 · 展示静态 fallback
        </span>
      );
    }
    if (expired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
          <AlertTriangle size={12} /> 已过期 {Math.abs(daysLeft!)} 天 · 请更换活码源或直接上传
        </span>
      );
    }
    if (expiring) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
          ⏳ 即将过期 · 剩余 {daysLeft} 天
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        ✅ 有效期剩余 {daysLeft} 天
      </span>
    );
  };

  return (
    <section className="max-w-6xl mx-auto px-4 pt-4">
      <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2.5">
          <QrCode size={16} />
          <span className="text-sm font-bold">微信群二维码</span>
          <span className="ml-auto text-[11px] text-white/80">
            每 7 天自动从活码源抓取 · 可手动上传兜底
          </span>
        </div>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-start">
          <div className="shrink-0 bg-sky-50 rounded-xl p-2 border border-sky-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                hasImage
                  ? `/api/public/qrcode/image?v=${cfg!.version}`
                  : "/images/qr/wechat-group.jpg"
              }
              alt="当前二维码"
              className="w-28 h-28 object-cover rounded-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/qr/wechat-group.jpg";
              }}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-2 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {statusBlock()}
              {cfg?.lastFetchError && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500">
                  <AlertTriangle size={12} /> 上次抓取出错：{cfg.lastFetchError}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {cfg?.uploadedAt
                ? `最新图片：${new Date(cfg.uploadedAt).toLocaleString("zh-CN")}（v${cfg.version}）`
                : "当前展示的是静态 fallback 图。配置活码 URL 或上传即可切换。"}
            </p>
            {cfg?.lastFetchedAt && (
              <p className="text-xs text-gray-400">
                上次自动抓取：{new Date(cfg.lastFetchedAt).toLocaleString("zh-CN")}
              </p>
            )}

            {/* 活码源 URL 配置 */}
            <div className="pt-2 mt-2 border-t border-sky-100 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                🔗 活码图片 URL（推荐草料二维码 / 微伴活码 / GitHub raw）
              </label>
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-sky-50 border border-sky-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={saveSource}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  保存并立即抓取
                </button>
                <button
                  onClick={manualRefresh}
                  disabled={saving || !cfg?.sourceUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
                  title={cfg?.sourceUrl ? "" : "请先配置活码 URL"}
                >
                  <RefreshCw size={14} />
                  手动拉一次
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-sky-50 border border-sky-200 text-gray-700 text-sm font-semibold rounded-xl cursor-pointer">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? "上传中…" : "直接上传图片"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFile}
                    disabled={uploading}
                  />
                </label>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-xl"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  刷新状态
                </button>
              </div>
            </div>

            {msg && <p className="text-xs text-gray-600 mt-1">{msg}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
