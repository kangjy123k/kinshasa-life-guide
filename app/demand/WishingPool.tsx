"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Search, Plus, X, Loader2, Trophy, Sparkles, Info } from "lucide-react";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

interface Wish {
  id: number;
  name: string;
  votes: number;
  createdAt: string;
  lastVotedAt: string | null;
}

export interface BubbleInstance {
  instanceId: number;
  wishId: number;
  spawnAt: number;
  // 3D 空间：x, y 为水平散布；z 从 -4（深水）→ 0（水面）
  x: number;
  y: number;
  zStart: number;
  zEnd: number;
  vx: number;
  vy: number;
  riseSpeed: number;       // z 单位/秒
  wobblePhase: number;
  wobbleAmp: number;
  poppedAt: number | null;
  popKind: "wish" | "decay" | null;
}

const FP_KEY = "klg_demand_fp";
const MAX_VISIBLE = 9;
const SPAWN_INTERVAL_MIN = 180;
const SPAWN_INTERVAL_MAX = 520;

function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

export function peakScaleFromVotes(votes: number): number {
  return 1 + Math.log10(votes + 1) * 0.35;
}

export function colorFromVotes(votes: number): { h: number; s: number; l: number } {
  const t = Math.min(1, Math.log10(votes + 1) / 2);
  const hue = 210 - 220 * t;
  return {
    h: (hue + 360) % 360,
    s: 70 + t * 25,
    l: 65 - t * 10,
  };
}

function pickNextWishId(
  all: Wish[],
  excludeIds: Set<number>,
  query: string
): number | null {
  const q = query.trim().toLowerCase();
  const pool = all.filter(
    (w) => !excludeIds.has(w.id) && (!q || w.name.toLowerCase().includes(q))
  );
  if (pool.length === 0) return null;
  const weights = pool.map((w) => Math.sqrt(w.votes + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

export default function WishingPool() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "warn" | "err" } | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [bubbles, setBubbles] = useState<BubbleInstance[]>([]);

  const fingerprint = useRef<string>("");
  useEffect(() => { fingerprint.current = getFingerprint(); }, []);

  const wishesRef = useRef<Wish[]>([]);
  const bubblesRef = useRef<BubbleInstance[]>([]);
  const queryRef = useRef("");
  const addingOpenRef = useRef(false);
  useEffect(() => { wishesRef.current = wishes; }, [wishes]);
  useEffect(() => { bubblesRef.current = bubbles; }, [bubbles]);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { addingOpenRef.current = addingOpen; }, [addingOpen]);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/demand/list?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = (await res.json()) as { ok: boolean; products: Wish[] };
      const fresh = data.products ?? [];
      setWishes((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        return fresh.map((s) => {
          const local = map.get(s.id);
          if (local && local.votes > s.votes) return { ...s, votes: local.votes };
          return s;
        });
      });
    } catch {
      setToast({ text: "加载失败，请检查网络", type: "err" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  // Spawn 循环：用 setTimeout 链，避免频繁 setState
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const bubbleIdCtr = { n: 1 };

    const schedule = () => {
      if (cancelled) return;
      const delay = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      timer = setTimeout(() => {
        if (!addingOpenRef.current) trySpawn(bubbleIdCtr);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function trySpawn(ctr: { n: number }) {
    if (wishesRef.current.length === 0) return;
    const active = bubblesRef.current.filter((b) => b.poppedAt === null);
    if (active.length >= MAX_VISIBLE) return;
    const excluded = new Set(bubblesRef.current.map((b) => b.wishId));
    const wid = pickNextWishId(wishesRef.current, excluded, queryRef.current);
    if (wid === null) return;

    // 在半径 3.3 内均匀撒点 (3D 坐标系)
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 3.2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const zStart = -4.5 - Math.random() * 0.5;
    const riseSpeed = 1.2 + Math.random() * 0.6; // ≈ 3-4s 升到水面

    setBubbles((prev) => [
      ...prev,
      {
        instanceId: ctr.n++,
        wishId: wid,
        spawnAt: performance.now(),
        x, y,
        zStart,
        zEnd: 0.1,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        riseSpeed,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 0.05 + Math.random() * 0.08,
        poppedAt: null,
        popKind: null,
      },
    ]);
  }

  // 回收已结束的气泡（定时检查）
  useEffect(() => {
    const iv = setInterval(() => {
      const now = performance.now();
      setBubbles((prev) => {
        const changed: BubbleInstance[] = [];
        let dirty = false;
        for (const b of prev) {
          if (b.poppedAt !== null && now - b.poppedAt > 500) {
            dirty = true;
            continue;
          }
          // 到达水面自动爆（decay）
          if (b.poppedAt === null) {
            const age = (now - b.spawnAt) / 1000;
            const z = b.zStart + age * b.riseSpeed;
            if (z >= b.zEnd) {
              dirty = true;
              changed.push({ ...b, poppedAt: now, popKind: "decay" });
              continue;
            }
          }
          changed.push(b);
        }
        return dirty ? changed : prev;
      });
    }, 200);
    return () => clearInterval(iv);
  }, []);

  const handleBubbleClick = useCallback(
    (instanceId: number) => {
      const b = bubblesRef.current.find((x) => x.instanceId === instanceId);
      const w = b ? wishesRef.current.find((x) => x.id === b.wishId) : null;
      if (!b || !w || b.poppedAt !== null) return;
      setToast({ text: `再点一次确认为「${w.name}」许愿`, type: "ok" });
    },
    []
  );

  const handleBubbleDoubleClick = useCallback(
    async (instanceId: number) => {
      const b = bubblesRef.current.find((x) => x.instanceId === instanceId);
      const w = b ? wishesRef.current.find((x) => x.id === b.wishId) : null;
      if (!b || !w || b.poppedAt !== null) return;
      await doWish(w, b);
    },
    []
  );

  async function doWish(wish: Wish, target: BubbleInstance | null) {
    if (votingId) return;
    setVotingId(wish.id);
    try {
      const res = await fetch("/api/demand/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wish.id, fingerprint: fingerprint.current }),
      });
      const data = (await res.json()) as
        | { ok: true; votes: number }
        | { ok: false; reason: string; cooldownHours?: number };
      if (!data.ok) {
        setToast({ text: data.reason, type: "warn" });
        return;
      }
      setToast({ text: `🪷 已为「${wish.name}」许愿 · 愿力 +1（总 ${data.votes}）`, type: "ok" });
      setWishes((prev) => prev.map((p) => (p.id === wish.id ? { ...p, votes: data.votes } : p)));

      if (target && target.poppedAt === null) {
        const now = performance.now();
        setBubbles((prev) =>
          prev.map((b) =>
            b.instanceId === target.instanceId
              ? { ...b, poppedAt: now, popKind: "wish" as const }
              : b
          )
        );
      }
    } catch {
      setToast({ text: "网络错误，请稍后重试", type: "err" });
    } finally {
      setVotingId(null);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const leaderboard = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wishes
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => b.votes - a.votes || a.id - b.id)
      .slice(0, 10);
  }, [wishes, query]);

  const wishById = useMemo(
    () => new Map(wishes.map((w) => [w.id, w])),
    [wishes]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020711] via-[#041326] to-[#000208] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#020711]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">🪷 许愿池</h1>
            <p className="text-[11px] text-white/60 leading-tight">
              水底翻涌 · 泡泡一簇簇冒上水面 · 抢在爆开前双击许愿
            </p>
          </div>
          <button
            onClick={() => setAddingOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-rose-500 hover:brightness-110 text-white text-xs font-semibold rounded-full shadow"
          >
            <Plus size={14} /> 加心愿
          </button>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-amber-300/60">
            <Search size={16} className="text-white/50 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜心愿：老干妈、感冒药、鼠标…"
              className="flex-1 bg-transparent text-sm placeholder-white/40 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="清空">
                <X size={14} className="text-white/50" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-2 mt-2">
        <div className="relative mx-auto rounded-[32px] overflow-hidden border border-sky-300/15"
             style={{
               aspectRatio: "1 / 1.1",
               maxWidth: 560,
               boxShadow: "inset 0 0 60px rgba(0,0,0,0.6), 0 20px 80px rgba(0,0,0,0.6)",
               background: "radial-gradient(ellipse at 50% 50%, #020a1e 0%, #04142d 40%, #08305d 80%, #0d4787 100%)",
             }}
        >
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white/60" size={28} /></div>}>
            <Scene3D
              bubbles={bubbles}
              wishById={wishById}
              addingOpen={addingOpen}
              onBubbleClick={handleBubbleClick}
              onBubbleDoubleClick={handleBubbleDoubleClick}
            />
          </Suspense>

          {loading && bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 size={28} className="animate-spin text-white/60" />
            </div>
          )}
          {!loading && wishes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-6 text-center pointer-events-none">
              水池里还空空的，点右上角「加心愿」投下第一个泡泡 →
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1"><Info size={11} />真·3D 水池</span>
        <span>· 单击确认</span>
        <span>· 双击许愿</span>
        <span>· 每心愿 24h 限 1 次</span>
      </div>

      <section className="max-w-4xl mx-auto px-4 mt-6 pb-10">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-yellow-400" />
          <h2 className="text-sm font-bold">愿力榜 Top {leaderboard.length}</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden divide-y divide-white/5">
          {leaderboard.length === 0 ? (
            <p className="px-4 py-6 text-center text-white/50 text-sm">没有匹配结果</p>
          ) : (
            leaderboard.map((w, i) => {
              const c = colorFromVotes(w.votes);
              return (
                <button
                  key={w.id}
                  onClick={() => doWish(w, null)}
                  disabled={votingId === w.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] disabled:opacity-60 transition text-left"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0 ? "bg-yellow-400 text-yellow-900"
                        : i === 1 ? "bg-slate-300 text-slate-800"
                        : i === 2 ? "bg-amber-500 text-amber-50"
                        : "bg-white/10 text-white/80"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{w.name}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{
                      background: `hsl(${c.h}deg ${c.s}% ${c.l}% / 0.85)`,
                      boxShadow: `0 0 10px hsl(${c.h}deg ${c.s}% ${c.l + 15}% / 0.55)`,
                    }}
                  >
                    ✨ {w.votes}
                  </span>
                  <span className="text-[10px] text-white/40">许愿</span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {addingOpen && (
        <AddWishModal
          onClose={() => setAddingOpen(false)}
          onAdded={async () => {
            setAddingOpen(false);
            await reload();
            setToast({ text: "新心愿已落入水中 ✨", type: "ok" });
          }}
          onToast={(t, type) => setToast({ text: t, type })}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40">
          <div
            className={`px-4 py-2 rounded-xl text-sm font-medium shadow-lg backdrop-blur ${
              toast.type === "ok"
                ? "bg-emerald-500/90 text-white"
                : toast.type === "warn"
                  ? "bg-amber-500/90 text-white"
                  : "bg-red-500/90 text-white"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

function AddWishModal({
  onClose,
  onAdded,
  onToast,
}: {
  onClose: () => void;
  onAdded: () => void;
  onToast: (text: string, type: "ok" | "warn" | "err") => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      onToast("请输入心愿内容", "warn");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/demand/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        onToast(data.reason ?? "提交失败", "warn");
        return;
      }
      onAdded();
    } catch {
      onToast("网络错误", "err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#030916]/95 backdrop-blur-md p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-[#0b1a3a] text-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-base font-bold">🪷 投下一个心愿</h3>
          <button onClick={onClose} aria-label="关闭" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs text-white/60">心愿内容（≤ 24 字）</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="例：冲牙器、电推子、隐形眼镜…"
            maxLength={24}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder-white/30 focus:outline-none focus:border-amber-300"
          />
          <p className="text-[11px] text-white/50">投下后会以 3D 泡泡形式从水底冒出，大家双击就能为它增加愿力。</p>
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-400 to-rose-500 text-white text-sm font-bold rounded-xl disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            投入水池
          </button>
        </div>
      </div>
    </div>
  );
}
