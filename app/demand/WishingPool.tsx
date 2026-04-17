"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, X, Loader2, Trophy, Sparkles, Info } from "lucide-react";

interface Wish {
  id: number;
  name: string;
  votes: number;
  createdAt: string;
  lastVotedAt: string | null;
}

interface Bubble {
  instanceId: number;
  wishId: number;
  spawnAt: number;   // performance.now()
  lifespan: number;  // ms
  x: number;         // 池内 px
  y: number;
  phase: number;
  poppedAt: number | null;
  popKind: "wish" | "decay" | null;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  kind: "tap" | "wish" | "decay";
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const FP_KEY = "klg_demand_fp";
const MAX_VISIBLE = 5;
const SPAWN_INTERVAL_MS = 1100;
const LIFESPAN_MIN = 7500;
const LIFESPAN_MAX = 10500;
const POP_ANIM_MS = 520;

function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

/** 气泡的生命周期缩放：从小到大到小，正弦峰形 */
function lifecycleScale(age: number, lifespan: number, peak: number): number {
  const t = Math.max(0, Math.min(1, age / lifespan));
  const curve = Math.sin(t * Math.PI); // 0 → 1 → 0
  return 0.3 + (peak - 0.3) * curve;
}
function lifecycleOpacity(age: number, lifespan: number): number {
  const t = Math.max(0, Math.min(1, age / lifespan));
  const curve = Math.sin(t * Math.PI);
  return 0.3 + 0.7 * curve;
}

/** 票数 → 峰值尺寸倍数 */
function peakScaleFromVotes(votes: number): number {
  return 1 + Math.log10(votes + 1) * 0.38;
}

/** 票数 → 颜色 */
function colorFromVotes(votes: number): { bg: string; ring: string; glow: string; text: string } {
  const t = Math.min(1, Math.log10(votes + 1) / 2);
  const hue = 210 - 220 * t;
  const adjHue = (hue + 360) % 360;
  const sat = 70 + t * 20;
  const light = 70 - t * 18;
  return {
    bg: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.88) 0%, hsla(${adjHue}, ${sat}%, ${light + 8}%, 0.85) 35%, hsla(${adjHue}, ${sat}%, ${light - 10}%, 0.8) 100%)`,
    ring: `hsla(${adjHue}, ${sat}%, ${Math.min(light + 20, 90)}%, 0.9)`,
    glow: `hsla(${adjHue}, ${sat}%, ${light + 15}%, 0.65)`,
    text: t > 0.55 ? "#3b1206" : "#0a1b36",
  };
}

/** 随机选一条心愿（避开已在池中 + 尊重搜索过滤） */
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
  // 按 sqrt(votes+1) 加权，热门略多曝光但非常温和
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
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const poolRef = useRef<HTMLDivElement | null>(null);
  const domRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastTapRef = useRef<{ instanceId: number | null; t: number }>({ instanceId: null, t: 0 });
  const lastSpawnRef = useRef<number>(0);
  const bubbleIdRef = useRef<number>(1);

  const addingOpenRef = useRef(false);
  const queryRef = useRef("");
  const wishesRef = useRef<Wish[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  useEffect(() => { addingOpenRef.current = addingOpen; }, [addingOpen]);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { wishesRef.current = wishes; }, [wishes]);
  useEffect(() => { bubblesRef.current = bubbles; }, [bubbles]);

  const fingerprint = useRef<string>("");
  useEffect(() => { fingerprint.current = getFingerprint(); }, []);

  // 池子尺寸
  const [dims, setDims] = useState({ w: 340, h: 460 });
  useEffect(() => {
    function recalc() {
      const w = Math.min(window.innerWidth - 16, 520);
      const reserve = 340;
      const h = Math.max(360, Math.min(window.innerHeight - reserve, 640));
      setDims({ w, h });
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  // 加载心愿
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

  // 选点：落在池内的椭圆安全区里
  function randomSpawnPoint(): { x: number; y: number } {
    const w = dims.w;
    const h = dims.h;
    const cx = w / 2;
    const cy = h / 2;
    // 椭圆安全区 = 池子内缩一点
    const rx = w * 0.38;
    const ry = h * 0.4;
    // 生成单位圆内点
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    return { x: cx + rx * r * Math.cos(a), y: cy + ry * r * Math.sin(a) };
  }

  // 物理+生命周期循环
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;

      if (!addingOpenRef.current) {
        // 1. 尝试生成新气泡
        maybeSpawn(t);

        // 2. 推进现有气泡（写 DOM）
        applyBubbleFrame(t);

        // 3. 回收已消失的气泡
        pruneBubbles(t);

        // 4. 清理涟漪 / 推进粒子
        setRipples((prev) => prev.filter((r) => t - r.id < 1400));
        setParticles((prev) => {
          if (!prev.length) return prev;
          const next: Particle[] = [];
          for (const p of prev) {
            const life = p.life - dt;
            if (life <= 0) continue;
            next.push({
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt + 70 * dt * (1 - life),
              vx: p.vx * 0.95,
              vy: p.vy * 0.95,
              life,
            });
          }
          return next;
        });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.w, dims.h]);

  function maybeSpawn(now: number) {
    if (wishesRef.current.length === 0) return;
    const active = bubblesRef.current.filter((b) => b.poppedAt === null);
    if (active.length >= MAX_VISIBLE) return;
    if (now - lastSpawnRef.current < SPAWN_INTERVAL_MS) return;
    const excluded = new Set(bubblesRef.current.map((b) => b.wishId));
    const nextWishId = pickNextWishId(wishesRef.current, excluded, queryRef.current);
    if (nextWishId === null) return;

    const pt = randomSpawnPoint();
    const lifespan = LIFESPAN_MIN + Math.random() * (LIFESPAN_MAX - LIFESPAN_MIN);
    const newBubble: Bubble = {
      instanceId: bubbleIdRef.current++,
      wishId: nextWishId,
      spawnAt: now,
      lifespan,
      x: pt.x,
      y: pt.y,
      phase: Math.random() * Math.PI * 2,
      poppedAt: null,
      popKind: null,
    };
    lastSpawnRef.current = now;
    setBubbles((prev) => [...prev, newBubble]);
  }

  function applyBubbleFrame(now: number) {
    const w = dims.w;
    const h = dims.h;
    const nameById = new Map(wishesRef.current.map((x) => [x.id, x]));
    const q = queryRef.current.trim().toLowerCase();
    const baseSize = Math.max(72, Math.min(w, h) * 0.32);

    for (const b of bubblesRef.current) {
      const el = domRef.current.get(b.instanceId);
      if (!el) continue;
      const wish = nameById.get(b.wishId);
      if (!wish) continue;

      const age = now - b.spawnAt;

      let scale: number;
      let opacity: number;

      if (b.poppedAt !== null) {
        // 爆裂动画
        const pt = Math.max(0, Math.min(1, (now - b.poppedAt) / POP_ANIM_MS));
        if (b.popKind === "wish") {
          // 愿望成就：向外膨胀消散
          scale = (1 + pt * 0.55) * peakScaleFromVotes(wish.votes);
          opacity = 1 - pt;
        } else {
          // 自然消散
          scale = (1 - pt * 0.5) * peakScaleFromVotes(wish.votes);
          opacity = Math.max(0, 0.8 - pt);
        }
      } else {
        // 生命周期缩放
        const peak = peakScaleFromVotes(wish.votes);
        scale = lifecycleScale(age, b.lifespan, peak);
        opacity = lifecycleOpacity(age, b.lifespan);
      }

      // 轻微摆动：上下微浮 + 水平漂
      const wobbleT = now / 1600 + b.phase;
      const ox = Math.sin(wobbleT) * 4;
      const oy = Math.cos(wobbleT * 1.3) * 3;

      const size = baseSize * scale;
      const match = !q || wish.name.toLowerCase().includes(q);

      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.transform = `translate3d(${b.x - size / 2 + ox}px, ${b.y - size / 2 + oy}px, 0)`;
      el.style.opacity = String(opacity * (match ? 1 : 0.25));
      el.style.pointerEvents = b.poppedAt === null && match ? "auto" : "none";

      // 颜色（票数变化才更新）
      if (el.dataset.lastVotes !== String(wish.votes)) {
        const c = colorFromVotes(wish.votes);
        el.style.background = c.bg;
        el.style.borderColor = c.ring;
        el.style.color = c.text;
        el.style.boxShadow = `0 0 ${size * 0.35}px ${c.glow}, inset 0 0 ${size * 0.45}px rgba(255,255,255,0.4)`;
        el.dataset.lastVotes = String(wish.votes);
      }

      const fs = Math.max(10, Math.min(18, size * 0.16));
      el.style.fontSize = `${fs}px`;
    }
  }

  function pruneBubbles(now: number) {
    const toKill: Bubble[] = [];
    const toRemove: number[] = [];
    for (const b of bubblesRef.current) {
      if (b.poppedAt === null) {
        const age = now - b.spawnAt;
        if (age > b.lifespan) {
          // 自然消散
          toKill.push(b);
        }
      } else if (now - b.poppedAt > POP_ANIM_MS + 40) {
        toRemove.push(b.instanceId);
      }
    }
    if (toKill.length === 0 && toRemove.length === 0) return;
    setBubbles((prev) => {
      let next = prev;
      if (toKill.length) {
        const killIds = new Set(toKill.map((b) => b.instanceId));
        next = next.map((b) =>
          killIds.has(b.instanceId)
            ? { ...b, poppedAt: now, popKind: "decay" as const }
            : b
        );
        for (const b of toKill) {
          spawnRipple(b.x, b.y, "decay");
        }
      }
      if (toRemove.length) {
        const rmSet = new Set(toRemove);
        next = next.filter((b) => !rmSet.has(b.instanceId));
      }
      return next;
    });
  }

  // 池面指针事件
  function poolCoord(e: React.PointerEvent): { x: number; y: number } | null {
    const el = poolRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPoolPointerDown(e: React.PointerEvent) {
    const pt = poolCoord(e);
    if (!pt) return;
    // 只在空白处（不在气泡上）生成涟漪
    const target = e.target as HTMLElement;
    if (target.closest("[data-bubble]")) return;
    spawnRipple(pt.x, pt.y, "tap");
  }

  function spawnRipple(x: number, y: number, kind: Ripple["kind"]) {
    setRipples((prev) => [...prev, { id: performance.now() + Math.random(), x, y, kind }]);
  }

  function spawnWishParticles(x: number, y: number) {
    const base = performance.now();
    const n = 12;
    const arr: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.35;
      const sp = 180 + Math.random() * 80;
      arr.push({
        id: base + i,
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 50,
        life: 0.8 + Math.random() * 0.5,
        color: ["#fde68a", "#fbbf24", "#fcd34d", "#fed7aa", "#fee2e2"][i % 5],
      });
    }
    setParticles((prev) => [...prev, ...arr]);
  }

  // 单 / 双击气泡
  async function onBubbleTap(b: Bubble, wish: Wish) {
    if (b.poppedAt !== null) return;
    const now = performance.now();
    const last = lastTapRef.current;
    if (last.instanceId === b.instanceId && now - last.t < 420) {
      lastTapRef.current = { instanceId: null, t: 0 };
      await doWish(b, wish);
      return;
    }
    lastTapRef.current = { instanceId: b.instanceId, t: now };
    setToast({ text: `再点一次确认为「${wish.name}」许愿`, type: "ok" });
    setTimeout(() => {
      if (lastTapRef.current.instanceId === b.instanceId) {
        lastTapRef.current = { instanceId: null, t: 0 };
      }
    }, 1500);
  }

  async function doWish(target: Bubble | null, wish: Wish) {
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

      // 爆裂当前气泡（若有）
      if (target && target.poppedAt === null) {
        const now = performance.now();
        setBubbles((prev) =>
          prev.map((b) =>
            b.instanceId === target.instanceId
              ? { ...b, poppedAt: now, popKind: "wish" as const }
              : b
          )
        );
        spawnRipple(target.x, target.y, "wish");
        spawnWishParticles(target.x, target.y);
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
    <div className="min-h-screen bg-gradient-to-b from-[#031023] via-[#072043] to-[#010612] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#031023]/75 border-b border-white/5">
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
              俯视池面 · 泡泡一个个冒出 · 双击抓住就是你的心愿
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

      <div className="relative flex items-center justify-center mt-2">
        <div
          ref={poolRef}
          onPointerDown={addingOpen ? undefined : onPoolPointerDown}
          className="relative overflow-hidden rounded-full border border-sky-300/15 select-none touch-none"
          style={{
            width: dims.w,
            height: dims.h,
            pointerEvents: addingOpen ? "none" : "auto",
            // 俯视水池：中心深，边缘浅，有井壁感
            background:
              "radial-gradient(ellipse at 50% 50%, #010813 0%, #03162e 35%, #0a2e5a 80%, #0f447d 100%)",
            boxShadow:
              "inset 0 0 60px rgba(0,0,0,0.55), inset 0 0 120px rgba(0,0,0,0.45), 0 18px 60px rgba(0,0,0,0.7)",
          }}
          aria-hidden={addingOpen}
        >
          {/* 水面光影 (caustics) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, rgba(140, 210, 255, 0.14) 0%, transparent 35%)," +
                "radial-gradient(circle at 70% 65%, rgba(200, 220, 255, 0.10) 0%, transparent 40%)," +
                "radial-gradient(circle at 85% 30%, rgba(255,255,255,0.06) 0%, transparent 30%)",
              animation: "wishing-caustics 9s ease-in-out infinite alternate",
            }}
          />
          {/* 池壁高光（边缘细圈） */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: "inset 0 0 0 2px rgba(180,220,255,0.12), inset 0 0 30px rgba(120,200,255,0.08)",
            }}
          />

          {/* 涟漪 */}
          {ripples.map((r) => {
            const age = (performance.now() - r.id) / 1400;
            const maxR =
              r.kind === "wish" ? 280 : r.kind === "decay" ? 90 : 160;
            const size = 16 + age * maxR;
            const op = Math.max(0, 1 - age);
            const color =
              r.kind === "wish" ? "rgba(253, 224, 71, 0.65)"
                : r.kind === "decay" ? "rgba(140, 190, 255, 0.35)"
                : "rgba(180, 220, 255, 0.55)";
            return (
              <div
                key={r.id}
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: r.x - size / 2,
                  top: r.y - size / 2,
                  width: size,
                  height: size,
                  border: `${r.kind === "wish" ? 2.5 : 1.5}px solid ${color}`,
                  opacity: op,
                }}
              />
            );
          })}

          {/* 粒子 */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: p.x - 3,
                top: p.y - 3,
                width: 6,
                height: 6,
                background: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                opacity: Math.max(0, p.life),
              }}
            />
          ))}

          {/* 气泡 */}
          {bubbles.map((b) => {
            const wish = wishById.get(b.wishId);
            if (!wish) return null;
            return (
              <div
                key={b.instanceId}
                data-bubble
                ref={(el) => {
                  if (el) domRef.current.set(b.instanceId, el);
                  else domRef.current.delete(b.instanceId);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onBubbleTap(b, wish);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  doWish(b, wish);
                }}
                className="absolute flex flex-col items-center justify-center rounded-full border backdrop-blur-sm will-change-transform text-center leading-tight select-none"
                style={{
                  borderColor: "rgba(255,255,255,0.4)",
                  padding: "6px",
                  transformOrigin: "center",
                }}
              >
                <span
                  className="font-bold line-clamp-2 break-words px-1"
                  style={{ maxWidth: "92%", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
                >
                  {wish.name}
                </span>
                <span className="text-[10px] font-black mt-0.5 opacity-90 inline-flex items-center gap-0.5">
                  <Sparkles size={10} />
                  {wish.votes}
                </span>
                {votingId === wish.id && (
                  <Loader2 size={12} className="absolute top-1 right-1 animate-spin text-white/80" />
                )}
              </div>
            );
          })}

          {loading && bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white/60" />
            </div>
          )}
          {!loading && wishes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-6 text-center">
              水池里还空空的，点右上角「加心愿」投下第一个泡泡 →
            </div>
          )}
          {!loading && wishes.length > 0 && query.trim() && bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm px-6 text-center">
              没有匹配的心愿浮上来，试试其他关键词
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1"><Info size={11} />每个泡泡只浮几秒</span>
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
                  onClick={() => doWish(null, w)}
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
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: c.text, background: c.bg, boxShadow: `0 0 10px ${c.glow}` }}
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

      <style jsx global>{`
        @keyframes wishing-caustics {
          0% { transform: translate(0, 0) scale(1); opacity: 0.75; }
          50% { transform: translate(6px, -4px) scale(1.06); opacity: 1; }
          100% { transform: translate(-5px, 3px) scale(0.97); opacity: 0.7; }
        }
      `}</style>
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
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
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
          <p className="text-[11px] text-white/50">投下后会以泡泡形式轮番冒出水面，大家双击就能为它增加愿力。</p>
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
