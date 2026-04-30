"use client";

import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  ThumbsUp,
  ThumbsDown,
  X,
  Lock,
  Hourglass,
  Trash2,
  Globe2,
  Loader2,
} from "lucide-react";

type Visibility = "private" | "pending" | "approved" | "rejected";
type Vote = "like" | "dislike";

interface RecordingItem {
  id: string;
  date: string;
  word: string;
  target: "word" | "example";
  audioId: string;
  ownerToken: string;
  visibility: Visibility;
  gender: string;
  region: string;
  likes: number;
  dislikes: number;
}

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=";

export function FwodPronunciationsPopup({
  date,
  target,
  targetText,
  onClose,
  onChanged,
}: {
  date: string;
  target: "word" | "example";
  targetText: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [items, setItems] = useState<RecordingItem[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({});
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/fwod/recording/list?date=${encodeURIComponent(date)}&target=${target}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        items?: RecordingItem[];
        myVotes?: Record<string, Vote>;
        ownerToken?: string | null;
      };
      if (data.ok && Array.isArray(data.items)) {
        setItems(data.items);
        setMyVotes(data.myVotes ?? {});
        setOwnerToken(data.ownerToken ?? null);
      }
    } catch (e) {
      console.error("[fwod popup] list failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, target]);

  useEffect(() => {
    return () => {
      try {
        audioRef.current?.pause();
      } catch {}
    };
  }, []);

  const close = () => {
    setShown(false);
    window.setTimeout(onClose, 220);
  };

  const play = async (item: RecordingItem) => {
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
      console.error("popup play failed:", e);
      setPlayingId(null);
    }
  };

  const vote = async (item: RecordingItem, v: Vote) => {
    if (item.visibility !== "approved") return;
    const cur = myVotes[item.id] ?? null;
    const next = cur === v ? null : v;
    // 乐观更新
    const optimistic = { ...item };
    if (cur === "like") optimistic.likes = Math.max(0, optimistic.likes - 1);
    if (cur === "dislike") optimistic.dislikes = Math.max(0, optimistic.dislikes - 1);
    if (next === "like") optimistic.likes += 1;
    if (next === "dislike") optimistic.dislikes += 1;
    setItems((arr) => arr.map((x) => (x.id === item.id ? optimistic : x)));
    setMyVotes((m) => {
      const copy = { ...m };
      if (next == null) delete copy[item.id];
      else copy[item.id] = next;
      return copy;
    });
    try {
      const res = await fetch(`/api/fwod/recording/${item.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: next }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        likes?: number;
        dislikes?: number;
        my?: Vote | null;
      };
      if (!data.ok) throw new Error("vote failed");
      setItems((arr) =>
        arr.map((x) =>
          x.id === item.id
            ? { ...x, likes: data.likes ?? x.likes, dislikes: data.dislikes ?? x.dislikes }
            : x,
        ),
      );
    } catch (e) {
      console.error("[fwod popup] vote failed:", e);
      // 失败回滚到服务器真值
      refresh();
    }
  };

  const publish = async (item: RecordingItem) => {
    try {
      const res = await fetch(`/api/fwod/recording/${item.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "pending" }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!data.ok) throw new Error("publish failed");
      onChanged();
      refresh();
    } catch (e) {
      console.error("publish failed:", e);
    }
  };

  const remove = async (item: RecordingItem) => {
    if (!window.confirm("确定删除这条录音？")) return;
    try {
      const res = await fetch(`/api/fwod/recording/${item.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean };
      if (!data.ok) throw new Error("delete failed");
      onChanged();
      refresh();
    } catch (e) {
      console.error("delete recording failed:", e);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      <div
        className={`w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl px-5 pt-4 pb-5 transition-transform duration-220 ${
          shown ? "translate-y-0" : "translate-y-6"
        } max-h-[80vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-gray-800">
              有 {items.filter((i) => i.visibility === "approved").length} 个发音
            </h3>
            <p className="text-[11px] text-gray-500 truncate">{targetText}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="关闭"
            className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        {loading && items.length === 0 && (
          <div className="py-6 flex items-center justify-center text-gray-400 text-xs">
            <Loader2 size={14} className="animate-spin mr-1" /> 加载中…
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">
            还没有人录音 — 你可以做第一个 🎤
          </p>
        )}

        <ul className="divide-y divide-gray-100">
          {items.map((item) => {
            const isMine = ownerToken && item.ownerToken === ownerToken;
            const isPlaying = playingId === item.id;
            const my = myVotes[item.id];
            return (
              <li key={item.id} className="py-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => play(item)}
                  aria-label="播放"
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition ${
                    isPlaying
                      ? "bg-red-100 text-red-500 animate-pulse"
                      : "bg-sky-100 text-sky-600"
                  }`}
                >
                  <Volume2 size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-gray-700">
                    {item.gender && <span className="font-medium">{item.gender}</span>}
                    {item.region && <span className="text-gray-500">{item.region}</span>}
                    {!item.gender && !item.region && (
                      <span className="text-gray-400">用户录音</span>
                    )}
                    {item.visibility === "private" && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        <Lock size={9} /> 仅自己
                      </span>
                    )}
                    {item.visibility === "pending" && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Hourglass size={9} /> 审核中
                      </span>
                    )}
                  </div>
                </div>

                {item.visibility === "approved" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => vote(item, "like")}
                      aria-label="点赞"
                      className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-semibold transition ${
                        my === "like"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-gray-500 hover:bg-emerald-50"
                      }`}
                    >
                      <ThumbsUp size={12} fill={my === "like" ? "currentColor" : "none"} />
                      {item.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => vote(item, "dislike")}
                      aria-label="踩"
                      className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-semibold transition ${
                        my === "dislike"
                          ? "bg-gray-200 text-gray-700"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <ThumbsDown
                        size={12}
                        fill={my === "dislike" ? "currentColor" : "none"}
                      />
                      {item.dislikes}
                    </button>
                  </>
                ) : isMine && item.visibility === "private" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => publish(item)}
                      aria-label="提交审核公开"
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50"
                    >
                      <Globe2 size={12} /> 公开
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label="删除"
                      className="inline-flex items-center px-2 py-1 rounded-full text-[11px] text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                ) : isMine ? (
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    aria-label="删除"
                    className="inline-flex items-center px-2 py-1 rounded-full text-[11px] text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
