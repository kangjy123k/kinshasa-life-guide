"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { AdminFwodPanel } from "@/components/AdminFwodPanel";
import { AdminFwodRecordingPanel } from "@/components/AdminFwodRecordingPanel";
import { BANK } from "@/lib/french-word-of-the-day";

const PASSWORD_KEY = "kinshasa_admin_pw";

export default function AdminFwodPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tryLogin = useCallback(async (pw: string) => {
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
      if (res.ok) {
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
      tryLogin(saved);
    }
  }, [tryLogin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    tryLogin(password.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem(PASSWORD_KEY);
    setAuthed(false);
    setPassword("");
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
            <p className="text-[11px] text-gray-500">静态 {BANK.length} 条</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg"
          >
            退出
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4">
        <AdminFwodPanel password={password} />
        <AdminFwodRecordingPanel password={password} />
      </main>
    </div>
  );
}
