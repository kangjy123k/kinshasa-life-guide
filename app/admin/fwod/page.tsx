"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { SingleImageUploader } from "@/components/ImageUploader";
import { BANK, type FrenchDailyEntry } from "@/lib/french-word-of-the-day";

const PASSWORD_KEY = "kinshasa_admin_pw";

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

export default function AdminFwodPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dynamicEntries, setDynamicEntries] = useState<FrenchDailyEntry[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);

  const load = useCallback(async (pw: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/fwod", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        setAuthError("密码不正确");
        return;
      }
      const d = (await res.json()) as { ok: boolean; entries?: FrenchDailyEntry[] };
      if (d.ok) {
        setDynamicEntries(d.entries ?? []);
        setAuthed(true);
        sessionStorage.setItem(PASSWORD_KEY, pw);
      }
    } catch {
      setAuthError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(PASSWORD_KEY);
    if (saved) {
      setPassword(saved);
      load(saved);
    }
  }, [load]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    load(password.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem(PASSWORD_KEY);
    setAuthed(false);
    setPassword("");
    setDynamicEntries([]);
  };

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
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(f),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) {
        showToast(d.error ?? "保存失败", "err");
        return;
      }
      showToast("已保存并上线", "ok");
      await load(password);
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
        await load(password);
      } else {
        showToast("删除失败", "err");
      }
    } catch {
      showToast("网络错误", "err");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-white flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-rose-100 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <Lock size={18} className="text-rose-500" />
            </span>
            <div>
              <h1 className="text-base font-bold text-gray-800">每日法语 · 后台上传</h1>
              <p className="text-[11px] text-gray-500">请输入管理员密码</p>
            </div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            className="w-full px-3 py-2.5 rounded-xl border border-rose-200 text-sm focus:outline-none focus:border-rose-400"
          />
          {authError && (
            <p className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">{authError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            登录
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-white pb-20">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-rose-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/admin"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-rose-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800">每日法语 · 后台上传</h1>
            <p className="text-[11px] text-gray-500">
              动态 {dynamicEntries.length} 条 · 静态 {BANK.length} 条
            </p>
          </div>
          <button
            onClick={() => load(password)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg inline-flex items-center gap-1"
          >
            <RefreshCw size={12} /> 刷新
          </button>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg"
          >
            退出
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        {/* 表单 */}
        <form
          onSubmit={submit}
          className="bg-white rounded-3xl shadow-sm border border-rose-100 p-4 space-y-3"
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

        {/* 动态条目列表 */}
        <section className="bg-white rounded-3xl shadow-sm border border-rose-100 p-4">
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
      </main>

      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40">
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
