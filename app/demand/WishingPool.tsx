"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Search, Plus, X, Loader2, Trophy } from "lucide-react";

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
  // 3D 空间：x, y 为水平散布；垂直 y（3D）由生命周期参数计算（抛物线）
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifespan: number;        // 总时长 ms
  wobblePhase: number;
  wobbleAmp: number;
  poppedAt: number | null;
  popKind: "wish" | null;  // 只留 wish；自然老去不做特殊动画
}

const FP_KEY = "klg_demand_fp";
const VOTED_KEY = "klg_demand_voted"; // { [wishId]: isoTimestamp } — 客户端 24h 隐藏用
const VOTED_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_VISIBLE = 8;
const SPAWN_INTERVAL_MIN = 320;
const SPAWN_INTERVAL_MAX = 720;
// 椭圆采样范围（横窄纵宽，贴合 1:1.1 竖屏画幅；留足边距给气泡半径 + 漂移 + 晃动不切边）
const POOL_RADIUS_X = 1.9;
const POOL_RADIUS_Y = 2.2;
const LIFESPAN_MIN = 4200;  // 抛物线总时长：小→大→小
const LIFESPAN_MAX = 5500;

function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

function loadVotedMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v !== "number") continue;
      if (now - v < VOTED_COOLDOWN_MS) next[k] = v;
    }
    return next;
  } catch {
    return {};
  }
}

function saveVotedMap(m: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(m));
  } catch {
    /* quota or disabled — fine */
  }
}

export function peakScaleFromVotes(votes: number): number {
  // 心愿数越多，泡泡越大；1 票时极小（视觉上约 10×10 像素）
  // 0 票：0.14（微点），10 票：~0.7，100 票：~1.55，1000+：~2.4
  return 0.14 + Math.min(2.3, Math.log10(votes + 1) * 0.75);
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
  query: string,
  votedMap: Record<string, number>,
): number | null {
  const q = query.trim().toLowerCase();
  const now = Date.now();
  const pool = all.filter((w) => {
    if (excludeIds.has(w.id)) return false;
    if (q && !w.name.toLowerCase().includes(q)) return false;
    const votedAt = votedMap[String(w.id)];
    if (votedAt && now - votedAt < VOTED_COOLDOWN_MS) return false;
    return true;
  });
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
  const [votedMap, setVotedMap] = useState<Record<string, number>>({});

  const fingerprint = useRef<string>("");
  useEffect(() => {
    fingerprint.current = getFingerprint();
    setVotedMap(loadVotedMap());
  }, []);

  const wishesRef = useRef<Wish[]>([]);
  const bubblesRef = useRef<BubbleInstance[]>([]);
  const queryRef = useRef("");
  const addingOpenRef = useRef(false);
  const votedMapRef = useRef<Record<string, number>>({});
  useEffect(() => { wishesRef.current = wishes; }, [wishes]);
  useEffect(() => { bubblesRef.current = bubbles; }, [bubbles]);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { addingOpenRef.current = addingOpen; }, [addingOpen]);
  useEffect(() => { votedMapRef.current = votedMap; }, [votedMap]);

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
    const wid = pickNextWishId(
      wishesRef.current,
      excluded,
      queryRef.current,
      votedMapRef.current,
    );
    if (wid === null) return;

    // 椭圆内撒点，偏向中心（幂次 >1 聚拢中心视觉重心），避开已在池中的气泡
    const newWish = wishesRef.current.find((w) => w.id === wid);
    const newPeak = newWish ? peakScaleFromVotes(newWish.votes) : 1;
    const peakCache = new Map<number, number>();
    const peakOf = (b: BubbleInstance) => {
      let p = peakCache.get(b.instanceId);
      if (p !== undefined) return p;
      const w = wishesRef.current.find((x) => x.id === b.wishId);
      p = w ? peakScaleFromVotes(w.votes) : 1;
      peakCache.set(b.instanceId, p);
      return p;
    };
    let placed: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const a = Math.random() * Math.PI * 2;
      const rFrac = Math.pow(Math.random(), 1.35); // 偏心：中心密集
      const cx = Math.cos(a) * rFrac * POOL_RADIUS_X;
      const cy = Math.sin(a) * rFrac * POOL_RADIUS_Y;
      const tooClose = active.some((b) => {
        // 球半径 0.6 × peak，两心距要 > r1+r2+0.1
        const gap = 0.6 * (newPeak + peakOf(b)) + 0.1;
        const dx = b.x - cx;
        const dy = b.y - cy;
        return dx * dx + dy * dy < gap * gap;
      });
      if (!tooClose) {
        placed = { x: cx, y: cy };
        break;
      }
    }
    if (!placed) return; // 找不到空位，本次跳过

    const lifespan = LIFESPAN_MIN + Math.random() * (LIFESPAN_MAX - LIFESPAN_MIN);

    setBubbles((prev) => [
      ...prev,
      {
        instanceId: ctr.n++,
        wishId: wid,
        spawnAt: performance.now(),
        x: placed.x,
        y: placed.y,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        lifespan,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 0.03 + Math.random() * 0.04,
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
          // 被点过 → 等爆裂动画结束 (500ms)
          if (b.poppedAt !== null) {
            if (now - b.poppedAt > 520) {
              dirty = true;
              continue;
            }
          } else {
            // 自然走完生命周期 → 静静消失
            if (now - b.spawnAt > b.lifespan) {
              dirty = true;
              continue;
            }
          }
          changed.push(b);
        }
        return dirty ? changed : prev;
      });
    }, 180);
    return () => clearInterval(iv);
  }, []);

  const handleBubbleClick = useCallback(
    (instanceId: number) => {
      const b = bubblesRef.current.find((x) => x.instanceId === instanceId);
      const w = b ? wishesRef.current.find((x) => x.id === b.wishId) : null;
      if (!b || !w || b.poppedAt !== null) return;
      setToast({ text: `双击为「${w.name}」许愿`, type: "ok" });
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
        // 服务器说已投过 → 本地也记一下，避免重复冒上来
        if (data.cooldownHours) {
          const next = { ...votedMapRef.current, [String(wish.id)]: Date.now() };
          setVotedMap(next);
          saveVotedMap(next);
        }
        return;
      }
      setToast({ text: `🪷 已为「${wish.name}」助力 · 愿力 +1（总 ${data.votes}）`, type: "ok" });
      setWishes((prev) => prev.map((p) => (p.id === wish.id ? { ...p, votes: data.votes } : p)));

      // 本地记录：已助力的心愿 24h 内不再出现
      const next = { ...votedMapRef.current, [String(wish.id)]: Date.now() };
      setVotedMap(next);
      saveVotedMap(next);

      // 立即把该心愿所有仍在池中的气泡爆掉（包括自己）
      const popAt = performance.now();
      setBubbles((prev) =>
        prev.map((b) =>
          b.wishId === wish.id && b.poppedAt === null
            ? { ...b, poppedAt: popAt, popKind: "wish" as const }
            : b,
        ),
      );
      if (target && target.poppedAt === null) {
        setBubbles((prev) =>
          prev.map((b) =>
            b.instanceId === target.instanceId && b.poppedAt === null
              ? { ...b, poppedAt: popAt, popKind: "wish" as const }
              : b,
          ),
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
    const now = Date.now();
    return wishes
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => {
        const v = votedMap[String(p.id)];
        return !v || now - v >= VOTED_COOLDOWN_MS;
      })
      .slice()
      .sort((a, b) => b.votes - a.votes || a.id - b.id)
      .slice(0, 10);
  }, [wishes, query, votedMap]);

  const wishById = useMemo(
    () => new Map(wishes.map((w) => [w.id, w])),
    [wishes]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020711] via-[#041326] to-[#000208] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#020711]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-4 flex items-start gap-3">
          <Link
            href="/"
            className="mt-1 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2 leading-none mb-1.5">
              <span className="text-3xl md:text-4xl drop-shadow">🪷</span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow">
                许愿池
              </h1>
            </div>
            <p className="text-sm md:text-base text-white/85 leading-snug drop-shadow">
              双击你最需要的商品
              <br />
              说不定不久市场上就会出现
            </p>
          </div>
          <span className="w-10 shrink-0" aria-hidden />
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <SearchOrAddBar
            query={query}
            onQueryChange={setQuery}
            onOpenAdd={() => setAddingOpen(true)}
          />
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-2 mt-2">
        {/* 下方月光光晕：让湖面像悬浮在深空中 */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-[-40px] w-[90%] max-w-[520px] h-24 pointer-events-none blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(58,148,230,0.45) 0%, rgba(13,71,135,0.25) 40%, transparent 75%)",
          }}
        />
        <div
          className="relative mx-auto"
          style={{
            aspectRatio: "1 / 1.1",
            maxWidth: 560,
          }}
        >
          {/* 水体本身：radial 渐变淡出到透明，没有硬边 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 58% 56% at 50% 50%, #0d4787 0%, #08305d 38%, #04142d 65%, rgba(2,7,17,0) 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 55% 56% at 50% 50%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 55% 56% at 50% 50%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)",
            }}
          />

          {/* 3D 水池，边缘被同样的 radial mask 柔化，看上去像悬浮水面 */}
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 55% 56% at 50% 50%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 55% 56% at 50% 50%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)",
            }}
          >
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white/60" size={28} />
                </div>
              }
            >
              <Scene3D
                bubbles={bubbles}
                wishById={wishById}
                addingOpen={addingOpen}
                onBubbleClick={handleBubbleClick}
                onBubbleDoubleClick={handleBubbleDoubleClick}
              />
            </Suspense>
          </div>

          {/* 水面高光（顶部薄雾） */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 55% 35% at 50% 20%, rgba(180,220,255,0.25) 0%, transparent 70%)",
            }}
          />

          {loading && bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 size={28} className="animate-spin text-white/60" />
            </div>
          )}
          {!loading && wishes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-6 text-center pointer-events-none">
              水池里还空空的，点上方「搜索或添加心愿商品」投下第一个泡泡 →
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span>单击确认</span>
        <span>· 双击助力</span>
        <span>· 已助力的心愿 24 小时内不再出现</span>
      </div>

      <section className="max-w-4xl mx-auto px-4 mt-6 pb-10">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-yellow-400" />
          <h2 className="text-sm font-bold">愿力榜 Top {leaderboard.length}</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden divide-y divide-white/5">
          {leaderboard.length === 0 ? (
            <p className="px-4 py-6 text-center text-white/50 text-sm">
              {Object.keys(votedMap).length > 0
                ? "已助力过的心愿 24 小时内暂不展示，换一个试试 ✨"
                : "没有匹配结果"}
            </p>
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
                  <span className="text-[10px] text-white/40">助力</span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {addingOpen && (
        <AddWishModal
          initialName={query.trim()}
          onClose={() => setAddingOpen(false)}
          onAdded={async () => {
            setAddingOpen(false);
            setQuery("");
            await reload();
            setToast({ text: "新心愿已落入水中 ✨", type: "ok" });
          }}
          onToast={(t, type) => setToast({ text: t, type })}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-40">
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

/* ---------------------------------------------------------------- */
/*  搜索 / 添加 · 合体按钮（搜不到时直接变成"添加"）                      */
/* ---------------------------------------------------------------- */
function SearchOrAddBar({
  query,
  onQueryChange,
  onOpenAdd,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onOpenAdd: () => void;
}) {
  const placeholder = "搜索或添加心愿商品（老干妈、感冒药、鼠标…）";
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 focus-within:border-amber-300/60 shadow-inner">
      <Search size={16} className="text-white/50 shrink-0" />
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm placeholder-white/40 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="清空"
          className="shrink-0"
        >
          <X size={14} className="text-white/50" />
        </button>
      )}
      <button
        type="button"
        onClick={onOpenAdd}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-rose-500 hover:brightness-110 text-white text-xs font-semibold rounded-full shadow"
      >
        <Plus size={13} />
        {query.trim() ? "添加" : "添加心愿"}
      </button>
    </div>
  );
}

function AddWishModal({
  initialName,
  onClose,
  onAdded,
  onToast,
}: {
  initialName?: string;
  onClose: () => void;
  onAdded: () => void;
  onToast: (text: string, type: "ok" | "warn" | "err") => void;
}) {
  const [name, setName] = useState(initialName ?? "");
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
