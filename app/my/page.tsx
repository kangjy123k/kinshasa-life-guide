"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Megaphone,
  UserPlus,
  UserSearch,
  Recycle,
  ShoppingCart,
  ClipboardList,
  Trash2,
  Inbox,
  RefreshCw,
  Sparkles,
  X,
  ImagePlus,
} from "lucide-react";
import { getOwnerToken } from "@/lib/owner-token-client";

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
  ownerToken?: string | null;
}

const TYPE_META: Record<
  SubmissionType,
  { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string }
> = {
  merchant:   { label: "商家入驻", Icon: Megaphone,    color: "text-sky-600",    bg: "bg-sky-100" },
  hiring:     { label: "招聘",     Icon: UserPlus,     color: "text-red-500",    bg: "bg-red-100" },
  jobseeker:  { label: "求职",     Icon: UserSearch,   color: "text-amber-600",  bg: "bg-amber-100" },
  secondhand: { label: "二手物品", Icon: Recycle,      color: "text-teal-600",   bg: "bg-teal-100" },
  purchase:   { label: "求购信息", Icon: ShoppingCart, color: "text-rose-600",   bg: "bg-rose-100" },
  survey:     { label: "问卷调研", Icon: ClipboardList,color: "text-indigo-600", bg: "bg-indigo-100" },
};

const STATUS_META: Record<
  Status,
  { label: string; cls: string; Icon: React.ComponentType<{ size?: number; className?: string }>; hint: string }
> = {
  pending: {
    label: "审核中",
    cls: "bg-yellow-100 text-yellow-700",
    Icon: Clock,
    hint: "通常 24 小时内完成审核",
  },
  approved: {
    label: "已通过",
    cls: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
    hint: "信息已公开展示",
  },
  rejected: {
    label: "未通过",
    cls: "bg-red-100 text-red-600",
    Icon: XCircle,
    hint: "如有疑问可重新发布或联系管理员",
  },
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const min = 60 * 1000;
    const hr = 60 * min;
    const day = 24 * hr;
    if (diff < min) return "刚刚";
    if (diff < hr) return `${Math.floor(diff / min)} 分钟前`;
    if (diff < day) return `${Math.floor(diff / hr)} 小时前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}

export default function MySubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [records, setRecords] = useState<SubmissionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = getOwnerToken();
      setHasToken(!!token);
      const headers: Record<string, string> = {};
      if (token) headers["x-owner-token"] = token;
      const res = await fetch("/api/my/submissions", {
        headers,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { records?: SubmissionRecord[] };
      setRecords(data.records ?? []);
    } catch {
      setError("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const pending = records.filter((r) => r.status === "pending").length;
  const approved = records.filter((r) => r.status === "approved").length;
  const rejected = records.filter((r) => r.status === "rejected").length;

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            aria-label="返回首页"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">我的发布</h1>
            <p className="text-[11px] text-white/80 mt-0.5">
              {loading
                ? "加载中…"
                : records.length === 0
                  ? "暂无发布记录"
                  : `共 ${records.length} 条 · 审核中 ${pending} · 已通过 ${approved} · 未通过 ${rejected}`}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            aria-label="刷新"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-95 transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
            {error}
          </div>
        )}

        {!loading && records.length === 0 && (
          <EmptyState hasToken={hasToken} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              onWithdrawn={(id) =>
                setRecords((prev) => prev.filter((x) => x.id !== id))
              }
              onUpdatesChanged={load}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ hasToken }: { hasToken: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-sky-100 items-center justify-center mb-3">
        <Inbox size={26} className="text-sky-400" />
      </div>
      <p className="text-sm text-gray-700 font-medium">
        {hasToken ? "暂无发布记录" : "还没有发布过信息"}
      </p>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
        回到首页点击「信息发布通道」发布后，
        <br />
        审核状态会出现在这里。
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-full active:scale-95 transition"
      >
        去首页发布
      </Link>
    </div>
  );
}

function RecordCard({
  record,
  onWithdrawn,
  onUpdatesChanged,
}: {
  record: SubmissionRecord;
  onWithdrawn: (id: string) => void;
  onUpdatesChanged: () => void;
}) {
  const meta = TYPE_META[record.type];
  const status = STATUS_META[record.status];
  const TIcon = meta.Icon;
  const SIcon = status.Icon;

  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  const canPostUpdate = record.type === "merchant" && record.status === "approved";
  const existingUpdates = useMemo(() => {
    const raw = record.data?.updates;
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [record.data?.updates]);

  // 标题：优先取最显著的字段
  const title =
    record.data.nameZh ||
    record.data.name ||
    record.data.itemName ||
    record.data.position ||
    meta.label;

  const entries = Object.entries(record.data).filter(([, v]) => v && v.trim());

  async function withdraw() {
    setWorking(true);
    try {
      const token = getOwnerToken();
      const res = await fetch("/api/my/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-owner-token": token } : {}),
        },
        body: JSON.stringify({ id: record.id }),
      });
      if (!res.ok) throw new Error("withdraw failed");
      // 渐出 260ms 再从列表移除
      setLeaving(true);
      setTimeout(() => onWithdrawn(record.id), 260);
    } catch {
      alert("撤回失败，请稍后再试");
      setWorking(false);
      setConfirming(false);
    }
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden transition-all duration-300 ease-out ${
        leaving ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
      >
        <span className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <TIcon size={16} className={meta.color} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {meta.label} · {formatTime(record.timestamp)}
          </p>
        </div>
        <span
          className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.cls}`}
        >
          <SIcon size={11} /> {status.label}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3 text-xs text-gray-600 space-y-1 border-t border-sky-50 pt-2.5">
            <p className="text-[11px] text-gray-500 italic">{status.hint}</p>
            {entries.length === 0 ? (
              <p className="text-gray-400">（无详情）</p>
            ) : (
              entries.slice(0, 18).map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <span className="text-gray-400 shrink-0">{k}:</span>
                  <span className="text-gray-700 break-words">{v}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="px-3.5 py-2.5 border-t border-sky-50 flex items-center justify-end gap-2">
        {canPostUpdate && !confirming && (
          <button
            onClick={() => setUpdateOpen(true)}
            disabled={working}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-lg shadow-sm active:scale-95 transition"
          >
            <Megaphone size={13} />
            发布新动态
            {existingUpdates > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full bg-white/25 text-[10px] font-black">
                {existingUpdates}
              </span>
            )}
          </button>
        )}
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={working}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 active:scale-95 transition"
          >
            <Trash2 size={13} />
            撤回
          </button>
        ) : (
          <>
            <span className="text-[11px] text-gray-500 mr-auto">确认撤回？</span>
            <button
              onClick={() => setConfirming(false)}
              disabled={working}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg active:scale-95 transition"
            >
              取消
            </button>
            <button
              onClick={withdraw}
              disabled={working}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg active:scale-95 transition disabled:opacity-50"
            >
              {working ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {working ? "撤回中" : "确认撤回"}
            </button>
          </>
        )}
      </div>

      {updateOpen && (
        <MerchantUpdateModal
          submissionId={record.id}
          onClose={() => setUpdateOpen(false)}
          onPosted={() => {
            setUpdateOpen(false);
            onUpdatesChanged();
          }}
        />
      )}
    </div>
  );
}

function MerchantUpdateModal({
  submissionId,
  onClose,
  onPosted,
}: {
  submissionId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 260);
      return true;
    });
  };

  const submit = async () => {
    if (!text.trim()) {
      setError("请填写动态内容");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = getOwnerToken();
      const images = imageUrls
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//i.test(s))
        .slice(0, 6);
      const res = await fetch("/api/merchant/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-owner-token": token } : {}),
        },
        body: JSON.stringify({ submissionId, text, images }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "发布失败");
      }
      onPosted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300 ease-out ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          closing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
            <Sparkles size={14} />
          </span>
          <h3 className="text-[15px] font-semibold text-gray-800 flex-1 min-w-0 truncate">
            发布新动态
          </h3>
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="w-7 h-7 -mr-1 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-95 transition"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">
              动态内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="新品到货 / 限时折扣 / 营业时间变更…"
              className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400"
            />
            <p className="mt-0.5 text-[10.5px] text-gray-400">{text.length} / 500</p>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1 flex items-center gap-1">
              <ImagePlus size={12} /> 图片 URL（可选 · 每行一张 · 最多 6 张）
            </label>
            <textarea
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              rows={3}
              placeholder="https://...\nhttps://..."
              className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">
              {error}
            </p>
          )}
          <p className="text-[10.5px] text-gray-400 leading-relaxed">
            动态发布后立即显示在商家卡片和详情页，14 天内会出现"新动态"小标志。最多保留 20 条。
          </p>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[13px] font-semibold rounded-full disabled:opacity-60 active:scale-95 transition"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 发布中…
              </>
            ) : (
              "发布动态"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
