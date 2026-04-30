"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, Volume2, X } from "lucide-react";

interface Recording {
  id: string;
  date: string;
  word: string;
  target: "word" | "example";
  audioId: string;
  ownerToken: string;
  visibility: string;
  gender: string;
  region: string;
  likes: number;
  dislikes: number;
  createdAt: string;
}

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=";

export function AdminFwodRecordingPanel({ password }: { password: string }) {
  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fwod/recording", {
        headers: { "x-admin-password": password },
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; items?: Recording[] };
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}`);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const play = async (item: Recording) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const a = audioRef.current;
    if (playingId === item.id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    if (!unlockedRef.current) {
      try {
        a.muted = true;
        a.src = SILENT_WAV;
        const p = a.play();
        if (p && typeof p.then === "function") await p.catch(() => {});
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        unlockedRef.current = true;
      } catch {}
    }
    a.src = `/api/media/${item.audioId}`;
    a.onended = () => setPlayingId(null);
    a.onerror = () => setPlayingId(null);
    try {
      await a.play();
      setPlayingId(item.id);
    } catch (e) {
      console.error("admin play failed:", e);
      setPlayingId(null);
    }
  };

  const moderate = async (item: Recording, action: "approve" | "reject") => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/fwod/recording/${item.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems((arr) => arr.filter((x) => x.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6 bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden">
      <header className="px-4 py-3 border-b border-rose-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">录音审核</h2>
          <p className="text-[11px] text-gray-500">用户提交的法语跟读，待你审核</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          刷新
        </button>
      </header>

      {error && (
        <p className="m-3 text-[11px] text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">{error}</p>
      )}

      {!loading && items.length === 0 && (
        <p className="px-4 py-6 text-center text-xs text-gray-400">没有待审录音</p>
      )}

      <ul className="divide-y divide-rose-50">
        {items.map((item) => {
          const isPlaying = playingId === item.id;
          const busy = busyId === item.id;
          return (
            <li key={item.id} className="px-4 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => play(item)}
                aria-label="播放"
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  isPlaying
                    ? "bg-red-100 text-red-500 animate-pulse"
                    : "bg-sky-100 text-sky-600"
                }`}
              >
                <Volume2 size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {item.word}{" "}
                  <span className="text-[11px] text-gray-400 font-normal">
                    {item.target === "example" ? "（例句）" : "（单词）"}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {item.date} · {item.gender || "未填性别"} · {item.region || "未填地区"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => moderate(item, "approve")}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold disabled:opacity-50"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                通过
              </button>
              <button
                type="button"
                onClick={() => moderate(item, "reject")}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold disabled:opacity-50"
              >
                <X size={12} /> 拒绝
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
