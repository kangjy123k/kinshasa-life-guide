"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { SingleImageUploader } from "@/components/ImageUploader";
import { BANK, type FrenchDailyEntry } from "@/lib/french-word-of-the-day";

interface FormState {
  date: string;
  word: string;
  pos: string;
  zh: string;
  pron: string;
  image: string;
  tip: string;
  example: string;
  exampleZh: string;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm(): FormState {
  return {
    date: todayISO(),
    word: "",
    pos: "",
    zh: "",
    pron: "",
    image: "",
    tip: "",
    example: "",
    exampleZh: "",
  };
}

/**
 * 每日法语一词的后台面板。接受已经验证过的 password 作为 prop，
 * 可直接嵌入 /admin 主页面，无需二次登录。
 */
export function AdminFwodPanel({ password }: { password: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dynamicEntries, setDynamicEntries] = useState<FrenchDailyEntry[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fwod", {
        headers: { "x-admin-password": password },
        cache: "no-store",
      });
      if (!res.ok) return;
      const d = (await res.json()) as { ok: boolean; entries?: FrenchDailyEntry[] };
      if (d.ok) setDynamicEntries(d.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  const prefillFromStatic = (date: string) => {
    const staticEntry = BANK.find((b) => b.date === date);
    const dynamic = dynamicEntries.find((e) => e.date === date);
    const src = dynamic ?? staticEntry;
    if (src) {
      setForm({
        date: src.date,
        word: src.word,
        pos: src.pos,
        zh: src.zh,
        pron: src.pron,
        image: src.image,
        tip: src.tip,
        example: src.example,
        exampleZh: src.exampleZh,
      });
    } else {
      setForm({ ...emptyForm(), date });
    }
  };

  const showToast = (text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2200);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = form;
    if (!f.date || !f.word.trim() || !f.zh.trim() || !f.pron.trim() || !f.image.trim()) {
      showToast("日期 / 法文 / 中文 / 读音 / 图片 必填", "err");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fwod", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(f),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) {
        showToast(d.error ?? "保存失败", "err");
        return;
      }
      showToast("已保存并上线", "ok");
      await load();
      setForm(emptyForm());
    } catch {
      showToast("网络错误", "err");
    } finally {
      setSaving(false);
    }
  };

  const del = async (date: string) => {
    if (!confirm(`确定删除 ${date} 的词条？前台会回落到静态词库。`)) return;
    try {
      const res = await fetch(`/api/admin/fwod?date=${encodeURIComponent(date)}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      const d = (await res.json()) as { ok: boolean };
      if (d.ok) {
        showToast("已删除", "ok");
        await load();
      } else {
        showToast("删除失败", "err");
      }
    } catch {
      showToast("网络错误", "err");
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl shadow-sm border border-rose-200 p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Plus size={14} className="text-rose-500" />
          新增 / 覆盖词条
          <button
            type="button"
            onClick={() => prefillFromStatic(form.date)}
            className="ml-auto text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-lg bg-rose-50"
          >
            按当前日期预填
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="刷新"
            className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded-lg bg-gray-50 inline-flex items-center gap-1"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            刷新
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="日期 *" hint="YYYY-MM-DD">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="词性" hint="例：v. / n.m. / adj.">
            <input
              value={form.pos}
              onChange={(e) => setForm((f) => ({ ...f, pos: e.target.value }))}
              placeholder="v."
              className={inputCls}
            />
          </Field>
          <Field label="法文单词 *" hint="带冠词可写 le béton">
            <input
              value={form.word}
              onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
              placeholder="prendre"
              className={inputCls}
            />
          </Field>
          <Field label="中文释义 *">
            <input
              value={form.zh}
              onChange={(e) => setForm((f) => ({ ...f, zh: e.target.value }))}
              placeholder="拿"
              className={inputCls}
            />
          </Field>
          <Field label="近似读音 *" hint="用户一眼能念出来">
            <input
              value={form.pron}
              onChange={(e) => setForm((f) => ({ ...f, pron: e.target.value }))}
              placeholder="彭的喝"
              className={inputCls}
            />
          </Field>
          <Field label="用法小贴士">
            <input
              value={form.tip}
              onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
              placeholder="万能动词..."
              className={inputCls}
            />
          </Field>
          <Field label="例句（法文）" className="col-span-2">
            <input
              value={form.example}
              onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
              placeholder="Prenez ce chemin, c'est plus court."
              className={inputCls}
            />
          </Field>
          <Field label="例句（中文）" className="col-span-2">
            <input
              value={form.exampleZh}
              onChange={(e) => setForm((f) => ({ ...f, exampleZh: e.target.value }))}
              placeholder="走这条路，更近。"
              className={inputCls}
            />
          </Field>
        </div>

        <div>
          <p className="text-[12px] font-medium text-gray-600 mb-1">释义图片 *</p>
          <SingleImageUploader
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            scope="fwod"
            placeholder="点击上传释义图片"
          />
          <p className="mt-1 text-[10.5px] text-gray-500">
            从手机相册选图，自动压缩上传。亦可手动填写 /fwod/xxx.webp 路径。
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow-sm active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          保存并上线
        </button>
      </form>

      <section className="bg-white rounded-3xl shadow-sm border border-rose-200 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
          <CalendarDays size={14} className="text-rose-500" />
          已上线的动态条目（{dynamicEntries.length}）
        </div>
        {dynamicEntries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            暂无。上方填表保存后会出现在这里。
          </p>
        ) : (
          <ul className="divide-y divide-rose-50">
            {dynamicEntries.map((e) => (
              <li key={e.date} className="py-3 flex items-start gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-rose-50 shrink-0">
                  {e.image && (
                    <Image
                      src={e.image}
                      alt={e.zh}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-400 tabular-nums">{e.date}</div>
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {e.word} · {e.zh}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">读音 {e.pron}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => prefillFromStatic(e.date)}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg bg-rose-50 inline-flex items-center gap-1"
                  >
                    <Check size={11} /> 编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => del(e.date)}
                    className="text-[11px] font-semibold text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg bg-gray-50 inline-flex items-center gap-1"
                  >
                    <Trash2 size={11} /> 删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div
            className={`px-4 py-2 rounded-xl text-sm font-medium shadow-lg backdrop-blur ${
              toast.tone === "ok" ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-2.5 py-2 border border-gray-200 bg-gray-50 rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400";

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium text-gray-600 mb-1">
        {label}
        {hint && <span className="ml-1 text-[10px] text-gray-400">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
