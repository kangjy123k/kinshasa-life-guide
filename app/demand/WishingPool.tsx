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

interface WishPhys {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  pulse: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  kind: "tap" | "wish";
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

function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

/** 票数 → 泡泡渲染半径（px） */
function radiusFromVotes(votes: number, base: number): number {
  return base * (1 + Math.log10(votes + 1) * 0.5);
}

/** 票数 → 颜色 */
function colorFromVotes(votes: number): { bg: string; ring: string; glow: string; text: string } {
  const t = Math.min(1, Math.log10(votes + 1) / 2); // 0 → 1
  const hue = 210 - 220 * t;
  const adjHue = (hue + 360) % 360;
  const sat = 70 + t * 20;
  const light = 70 - t * 18;
  return {
    bg: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85) 0%, hsla(${adjHue}, ${sat}%, ${light + 8}%, 0.85) 35%, hsla(${adjHue}, ${sat}%, ${light - 10}%, 0.78) 100%)`,
    ring: `hsla(${adjHue}, ${sat}%, ${Math.min(light + 20, 90)}%, 0.9)`,
    glow: `hsla(${adjHue}, ${sat}%, ${light + 15}%, 0.6)`,
    text: t > 0.55 ? "#3b1206" : "#0a1b36",
  };
}

export default function WishingPool() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "warn" | "err" } | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const poolRef = useRef<HTMLDivElement | null>(null);
  const physRef = useRef<Map<number, WishPhys>>(new Map());
  const domRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const pointerRef = useRef<{ active: boolean; id: number | null; x: number; y: number; downT: number; moved: boolean }>({
    active: false, id: null, x: 0, y: 0, downT: 0, moved: false,
  });
  const lastTapRef = useRef<{ id: number | null; t: number }>({ id: null, t: 0 });
  const addingOpenRef = useRef(false);
  const queryRef = useRef("");
  const wishesRef = useRef<Wish[]>([]);
  const [dims, setDims] = useState({ w: 360, h: 520 });

  useEffect(() => { addingOpenRef.current = addingOpen; }, [addingOpen]);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { wishesRef.current = wishes; }, [wishes]);

  const fingerprint = useRef<string>("");
  useEffect(() => {
    fingerprint.current = getFingerprint();
  }, []);

  // 响应窗口尺寸
  useEffect(() => {
    function recalc() {
      const w = Math.min(window.innerWidth - 16, 560);
      const reserve = 340;
      const h = Math.max(380, Math.min(window.innerHeight - reserve, 720));
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
  useEffect(() => {
    reload();
  }, []);

  // wishes 变化 → 同步 phys state（新增的从底下浮入）
  useEffect(() => {
    if (!dims.w || !dims.h) return;
    const now = performance.now();
    const next = new Map<number, WishPhys>();
    wishes.forEach((w, i) => {
      const existing = physRef.current.get(w.id);
      if (existing) {
        next.set(w.id, existing);
      } else {
        next.set(w.id, {
          id: w.id,
          x: 40 + Math.random() * Math.max(40, dims.w - 80),
          y: dims.h + 40 + Math.random() * 200 + i * 8,
          vx: (Math.random() - 0.5) * 12,
          vy: -22 - Math.random() * 18,
          phase: Math.random() * Math.PI * 2 + now / 1000,
          pulse: 1,
        });
      }
    });
    physRef.current = next;
  }, [wishes, dims.w, dims.h]);

  // 物理循环
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;

      if (!addingOpenRef.current) {
        stepPhysics(dt, t);
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
              y: p.y + p.vy * dt + 60 * dt * (1 - life),
              vx: p.vx * 0.96,
              vy: p.vy * 0.96,
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

  function stepPhysics(dt: number, t: number) {
    const W = dims.w;
    const H = dims.h;
    const p = pointerRef.current;
    const q = queryRef.current.trim().toLowerCase();

    const nameById = new Map(wishesRef.current.map((w) => [w.id, { name: w.name, votes: w.votes }]));

    const TERMINAL_VY = -28;
    const WOBBLE_AMP = 18;
    const REPULSE_R = 92;
    const BASE_RADIUS = Math.max(30, W * 0.09);

    physRef.current.forEach((s) => {
      const info = nameById.get(s.id);
      if (!info) return;

      s.vy += (TERMINAL_VY - s.vy) * 0.03;
      s.vx += Math.sin(t / 900 + s.phase) * WOBBLE_AMP * dt;
      s.vx *= 0.95;

      if (p.active) {
        const dx = s.x - p.x;
        const dy = s.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPULSE_R * REPULSE_R && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = ((REPULSE_R - d) / REPULSE_R) * 260;
          s.vx += (dx / d) * f * dt;
          s.vy += (dy / d) * f * dt;
        }
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const r = radiusFromVotes(info.votes, BASE_RADIUS);
      if (s.x < r) { s.x = r; s.vx = Math.abs(s.vx) * 0.5; }
      else if (s.x > W - r) { s.x = W - r; s.vx = -Math.abs(s.vx) * 0.5; }
      if (s.y < -r - 40) {
        s.y = H + r + Math.random() * 80;
        s.x = r + Math.random() * Math.max(1, W - 2 * r);
        s.vy = -22 - Math.random() * 14;
        s.vx = (Math.random() - 0.5) * 12;
        s.phase = Math.random() * Math.PI * 2 + t / 1000;
      }
      if (s.y > H + 200) {
        s.vy = Math.min(s.vy, -18);
      }

      if (s.pulse > 1.001) s.pulse += (1 - s.pulse) * 0.12;

      const el = domRef.current.get(s.id);
      if (!el) return;
      const size = r * 2 * s.pulse;
      const match = !q || info.name.toLowerCase().includes(q);

      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.transform = `translate3d(${s.x - size / 2}px, ${s.y - size / 2}px, 0)`;
      el.style.opacity = match ? "1" : "0.2";
      el.style.pointerEvents = match ? "auto" : "none";

      if (el.dataset.lastVotes !== String(info.votes)) {
        const c = colorFromVotes(info.votes);
        el.style.background = c.bg;
        el.style.borderColor = c.ring;
        el.style.color = c.text;
        el.style.boxShadow = `0 0 ${r * 0.7}px ${c.glow}, inset 0 0 ${r * 0.5}px rgba(255,255,255,0.35)`;
        el.dataset.lastVotes = String(info.votes);
      }

      const fs = Math.max(10, Math.min(16, size * 0.15));
      el.style.fontSize = `${fs}px`;
    });
  }

  function poolCoord(e: React.PointerEvent): { x: number; y: number } | null {
    const el = poolRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPoolPointerDown(e: React.PointerEvent) {
    const pt = poolCoord(e);
    if (!pt) return;
    pointerRef.current = {
      active: true, id: e.pointerId, x: pt.x, y: pt.y,
      downT: performance.now(), moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    spawnRipple(pt.x, pt.y, "tap");
  }

  function onPoolPointerMove(e: React.PointerEvent) {
    const p = pointerRef.current;
    if (p.id !== e.pointerId) return;
    const pt = poolCoord(e);
    if (!pt) return;
    const dx = pt.x - p.x;
    const dy = pt.y - p.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) p.moved = true;
    p.x = pt.x;
    p.y = pt.y;
  }

  function onPoolPointerUp(e: React.PointerEvent) {
    pointerRef.current = { active: false, id: null, x: 0, y: 0, downT: 0, moved: false };
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function spawnRipple(x: number, y: number, kind: "tap" | "wish") {
    setRipples((prev) => [...prev, { id: performance.now() + Math.random(), x, y, kind }]);
  }

  function spawnWishParticles(x: number, y: number) {
    const base = performance.now();
    const n = 10;
    const arr: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 180 + Math.random() * 60;
      arr.push({
        id: base + i,
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.8 + Math.random() * 0.4,
        color: ["#fde68a", "#fbbf24", "#fcd34d", "#fed7aa", "#fee2e2"][i % 5],
      });
    }
    setParticles((prev) => [...prev, ...arr]);
  }

  async function onBubbleTap(w: Wish, phys: WishPhys | undefined) {
    if (pointerRef.current.moved) return;
    const now = performance.now();
    const last = lastTapRef.current;
    if (last.id === w.id && now - last.t < 420) {
      lastTapRef.current = { id: null, t: 0 };
      await doWish(w, phys);
      return;
    }
    lastTapRef.current = { id: w.id, t: now };
    setToast({ text: `再点一次确认为「${w.name}」许愿`, type: "ok" });
    if (phys) phys.pulse = 1.12;
    setTimeout(() => {
      if (lastTapRef.current.id === w.id) lastTapRef.current = { id: null, t: 0 };
    }, 1500);
  }

  async function doWish(w: Wish, phys: WishPhys | undefined) {
    if (votingId) return;
    setVotingId(w.id);
    try {
      const res = await fetch("/api/demand/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: w.id, fingerprint: fingerprint.current }),
      });
      const data = (await res.json()) as
        | { ok: true; votes: number }
        | { ok: false; reason: string; cooldownHours?: number };
      if (!data.ok) {
        setToast({ text: data.reason, type: "warn" });
        return;
      }
      setToast({ text: `🪷 已为「${w.name}」许愿 · 愿力 +1（总 ${data.votes}）`, type: "ok" });
      setWishes((prev) => prev.map((p) => (p.id === w.id ? { ...p, votes: data.votes } : p)));
      if (phys) {
        phys.pulse = 1.45;
        spawnRipple(phys.x, phys.y, "wish");
        spawnWishParticles(phys.x, phys.y);
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
              拨弄水中的泡泡 · 双击许愿 · 愿力越旺，心愿越容易被听见
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
          onPointerMove={addingOpen ? undefined : onPoolPointerMove}
          onPointerUp={addingOpen ? undefined : onPoolPointerUp}
          onPointerCancel={addingOpen ? undefined : onPoolPointerUp}
          className="relative overflow-hidden rounded-[28px] border border-sky-300/15 select-none touch-none"
          style={{
            width: dims.w,
            height: dims.h,
            pointerEvents: addingOpen ? "none" : "auto",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(100,210,255,0.22), transparent 55%)," +
              "linear-gradient(180deg, #073358 0%, #052036 55%, #02101f 100%)",
            boxShadow:
              "inset 0 8px 40px rgba(0,0,0,0.35), inset 0 -20px 80px rgba(0,200,255,0.08), 0 0 40px rgba(0,0,0,0.6)",
          }}
          aria-hidden={addingOpen}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-80 wishing-caustics"
            style={{
              background:
                "radial-gradient(circle at 20% 25%, rgba(150, 230, 255, 0.10) 0%, transparent 45%)," +
                "radial-gradient(circle at 70% 65%, rgba(200, 220, 255, 0.08) 0%, transparent 40%)," +
                "radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.06) 0%, transparent 30%)",
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 h-24 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(4,24,48,0.6) 70%, rgba(0,0,0,0.7) 100%)",
            }}
          />

          {ripples.map((r) => {
            const age = (performance.now() - r.id) / 1400;
            const size = 20 + age * (r.kind === "wish" ? 260 : 140);
            const op = Math.max(0, 1 - age);
            return (
              <div
                key={r.id}
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: r.x - size / 2,
                  top: r.y - size / 2,
                  width: size,
                  height: size,
                  border: `2px solid ${r.kind === "wish" ? "rgba(253, 224, 71, 0.6)" : "rgba(180, 220, 255, 0.55)"}`,
                  opacity: op,
                }}
              />
            );
          })}

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

          {wishes.map((w) => (
            <div
              key={w.id}
              ref={(el) => {
                if (el) domRef.current.set(w.id, el);
                else domRef.current.delete(w.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBubbleTap(w, physRef.current.get(w.id));
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                doWish(w, physRef.current.get(w.id));
              }}
              className="absolute flex flex-col items-center justify-center rounded-full border backdrop-blur-sm will-change-transform text-center leading-tight select-none"
              style={{
                borderColor: "rgba(255,255,255,0.35)",
                padding: "6px",
                transformOrigin: "center",
                transition: "box-shadow 0.2s",
              }}
            >
              <span
                className="font-bold line-clamp-2 break-words px-1"
                style={{ maxWidth: "92%", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
              >
                {w.name}
              </span>
              <span className="text-[10px] font-black mt-0.5 opacity-90 inline-flex items-center gap-0.5">
                <Sparkles size={10} />
                {w.votes}
              </span>
              {votingId === w.id && (
                <Loader2 size={12} className="absolute top-1 right-1 animate-spin text-white/80" />
              )}
            </div>
          ))}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white/60" />
            </div>
          )}
          {!loading && wishes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-6 text-center">
              水池里还空空的，点右上角「加心愿」投下第一个泡泡 →
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1"><Info size={11} />拖拽拨水</span>
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
                  onClick={() => doWish(w, physRef.current.get(w.id))}
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
          <p className="text-[11px] text-white/50">投下后化作泡泡浮入水中，让大家一起为它许愿增加愿力。</p>
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
