"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, X, Loader2, Trophy, Info } from "lucide-react";

interface Product {
  id: number;
  name: string;
  votes: number;
  createdAt: string;
  lastVotedAt: string | null;
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

/** Fibonacci 球面均匀布点 → N 个点 { x, y, z } ∈ 单位球 */
function fibonacciSphere(n: number): Array<{ x: number; y: number; z: number }> {
  const pts: Array<{ x: number; y: number; z: number }> = [];
  if (n <= 0) return pts;
  const offset = 2 / n;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * increment;
    pts.push({
      x: Math.cos(phi) * r,
      y,
      z: Math.sin(phi) * r,
    });
  }
  return pts;
}

/** 票数 → 气泡渲染尺寸（主宽高 px） */
function sizeFromVotes(votes: number, base: number): number {
  return base * (1 + Math.log10(votes + 1) * 0.38);
}

/** 票数 → 颜色（HSL，热度越高越红） */
function colorFromVotes(votes: number): { bg: string; border: string; text: string; glow: string } {
  const intensity = Math.min(1, Math.log10(votes + 1) / 2); // 0 → 1
  const hue = 220 - 220 * intensity; // 220(蓝) → 0(红)
  const sat = 60 + intensity * 30;
  const light = 62 - intensity * 14;
  return {
    bg: `hsl(${hue} ${sat}% ${light}% / 0.85)`,
    border: `hsl(${hue} ${sat}% ${Math.min(light + 18, 90)}% / 0.9)`,
    text: "#fff",
    glow: `hsl(${hue} ${sat}% ${light + 25}% / 0.55)`,
  };
}

export default function BubbleSphere() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "warn" | "err" } | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // 几何与动画
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rotRef = useRef({ x: -0.15, y: 0, vx: 0, vy: 0.3 /* rad/sec */ });
  const pointerRef = useRef<{ id: number | null; lastX: number; lastY: number; lastT: number; moved: boolean; downT: number; dx: number; dy: number }>({
    id: null, lastX: 0, lastY: 0, lastT: 0, moved: false, downT: 0, dx: 0, dy: 0,
  });
  const lastTapRef = useRef<{ id: number | null; t: number }>({ id: null, t: 0 });
  const [dims, setDims] = useState({ size: 340, radius: 150 });

  const fingerprint = useRef<string>("");
  useEffect(() => {
    fingerprint.current = getFingerprint();
  }, []);

  // 响应窗口尺寸
  useEffect(() => {
    function recalc() {
      const w = Math.min(window.innerWidth - 24, 560);
      const h = window.innerHeight;
      const size = Math.max(260, Math.min(w, h - 260));
      setDims({ size, radius: size * 0.42 });
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  // 加载数据（带 cache-bust + 合并策略：若服务器返回的 votes 比本地小，保留本地，防 CDN stale 覆盖乐观更新）
  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/demand/list?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = (await res.json()) as { ok: boolean; products: Product[] };
      const fresh = data.products ?? [];
      setProducts((prev) => {
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

  // 每个产品对应一个固定球面点
  const points = useMemo(() => fibonacciSphere(products.length), [products.length]);

  // ----- 动画循环：rotY 自动累加 + rotX 自然回正 -----
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const AUTO_SPIN = 0.3; // rad/s

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;

      // 加商品 modal 打开时冻结球，避免背后干扰
      if (addingOpen) {
        raf = requestAnimationFrame(loop);
        return;
      }

      // 拖拽中：由 pointermove 直接累加；否则自动转 + 摩擦让 vy 回到 AUTO_SPIN
      if (pointerRef.current.id === null) {
        rotRef.current.y += rotRef.current.vy * dt;
        rotRef.current.x += rotRef.current.vx * dt;
        // 缓慢回到自动转速
        rotRef.current.vy += (AUTO_SPIN - rotRef.current.vy) * 0.02;
        // x 角速度逐渐归零 + x 本身归零（不要让球翻掉）
        rotRef.current.vx *= 0.95;
        rotRef.current.x += (-0.15 - rotRef.current.x) * 0.015;
      }

      applyTransforms();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, dims.size, dims.radius, query, highlightId, addingOpen]);

  function applyTransforms() {
    const { size, radius } = dims;
    const cx = size / 2;
    const cy = size / 2;
    const rx = rotRef.current.x;
    const ry = rotRef.current.y;
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);

    const q = query.trim().toLowerCase();
    const match = (p: Product) => !q || p.name.toLowerCase().includes(q);

    const base = Math.max(56, size * 0.19); // 气泡基础 size

    products.forEach((p, i) => {
      const el = bubbleRefs.current.get(p.id);
      if (!el) return;
      const pt = points[i];
      if (!pt) return;

      // 先绕 Y，再绕 X
      let x = pt.x * cosY + pt.z * sinY;
      let z = -pt.x * sinY + pt.z * cosY;
      let y = pt.y;

      const y2 = y * cosX - z * sinX;
      const z2 = y * sinX + z * cosX;
      y = y2;
      z = z2;

      const sx = cx + x * radius;
      const sy = cy + y * radius;
      const depth = (z + 1) / 2; // 0 (后) → 1 (前)
      const depthScale = 0.55 + 0.45 * depth;
      const opacity = 0.35 + 0.65 * depth;
      const sz = sizeFromVotes(p.votes, base) * depthScale;

      el.style.width = `${sz}px`;
      el.style.height = `${sz}px`;
      el.style.left = `${sx - sz / 2}px`;
      el.style.top = `${sy - sz / 2}px`;
      const hit = match(p);
      el.style.opacity = String(hit ? opacity : opacity * 0.22);
      el.style.zIndex = String(Math.round(depth * 1000));
      el.style.pointerEvents = depth > 0.35 && hit ? "auto" : "none";

      // 文字字号随尺寸缩放
      const fs = Math.max(9, Math.min(15, sz * 0.19));
      el.style.fontSize = `${fs}px`;

      // 颜色（只在 votes 变化时改，用 data-votes 记忆）
      if (el.dataset.lastVotes !== String(p.votes)) {
        const c = colorFromVotes(p.votes);
        el.style.background = `radial-gradient(circle at 35% 30%, ${c.border}, ${c.bg} 70%)`;
        el.style.boxShadow = `0 0 ${sz * 0.4}px ${c.glow}`;
        el.style.borderColor = c.border;
        el.dataset.lastVotes = String(p.votes);
      }

      // 高亮刚投过的
      el.style.transform = highlightId === p.id ? "scale(1.18)" : "scale(1)";
    });
  }

  // ---- 指针交互 ----
  function onPointerDown(e: React.PointerEvent) {
    const now = performance.now();
    pointerRef.current = {
      id: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: now,
      moved: false,
      downT: now,
      dx: 0,
      dy: 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = pointerRef.current;
    if (p.id !== e.pointerId) return;
    const dx = e.clientX - p.lastX;
    const dy = e.clientY - p.lastY;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    const now = performance.now();
    const dt = Math.max(0.001, (now - p.lastT) / 1000);
    p.lastT = now;
    if (Math.abs(dx) + Math.abs(dy) > 3) p.moved = true;
    p.dx += dx;
    p.dy += dy;
    // 0.01 rad / px
    rotRef.current.y += dx * 0.01;
    rotRef.current.x += dy * 0.01;
    // 记录速度用于 inertia
    rotRef.current.vy = (dx * 0.01) / dt;
    rotRef.current.vx = (dy * 0.01) / dt;
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = pointerRef.current;
    pointerRef.current = { id: null, lastX: 0, lastY: 0, lastT: 0, moved: false, downT: 0, dx: 0, dy: 0 };
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    // 松手后不做任何事（tap/double-tap 由气泡自身处理）
    if (!p.moved) {
      // 若 pointerup 不是落在气泡上，什么也不做
    }
  }

  // ---- 气泡单击/双击 ----
  async function onBubbleTap(product: Product) {
    // 单击：高亮显示该气泡信息；双击窗口内 → 投票
    const now = performance.now();
    const last = lastTapRef.current;
    if (last.id === product.id && now - last.t < 420) {
      lastTapRef.current = { id: null, t: 0 };
      await doVote(product);
      return;
    }
    lastTapRef.current = { id: product.id, t: now };
    setHighlightId(product.id);
    setToast({ text: `再点一次确认为「${product.name}」投票`, type: "ok" });
    setTimeout(() => {
      if (lastTapRef.current.id === product.id) {
        lastTapRef.current = { id: null, t: 0 };
      }
      setHighlightId((h) => (h === product.id ? null : h));
    }, 1500);
  }

  async function doVote(product: Product) {
    if (votingId) return;
    setVotingId(product.id);
    try {
      const res = await fetch("/api/demand/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, fingerprint: fingerprint.current }),
      });
      const data = (await res.json()) as
        | { ok: true; votes: number }
        | { ok: false; reason: string; cooldownHours?: number };
      if (!data.ok) {
        setToast({ text: data.reason, type: "warn" });
      } else {
        setToast({ text: `已为「${product.name}」+1 热度（总 ${data.votes}）`, type: "ok" });
        // 乐观更新（也会被下次 reload 覆盖）
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, votes: data.votes } : p))
        );
        setHighlightId(product.id);
        setTimeout(() => setHighlightId(null), 900);
      }
    } catch {
      setToast({ text: "网络错误，请稍后重试", type: "err" });
    } finally {
      setVotingId(null);
    }
  }

  // ---- toast 自动消失 ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- 排行榜 ----
  const leaderboard = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f24] via-[#111a38] to-[#050816] text-white">
      {/* 顶部 */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0a0f24]/70 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">🪐 商品需求榜</h1>
            <p className="text-[11px] text-white/60 leading-tight">双击气泡投票 · 泡越大 = 想要的人越多</p>
          </div>
          <button
            onClick={() => setAddingOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-400 to-rose-500 hover:brightness-110 text-white text-xs font-semibold rounded-full shadow"
          >
            <Plus size={14} /> 加商品
          </button>
        </div>
        {/* 搜索 */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-sky-400/60">
            <Search size={16} className="text-white/50 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜：鼠标、老干妈、感冒药…"
              className="flex-1 bg-transparent text-sm placeholder-white/40 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="清空">
                <X size={14} className="text-white/50" />
              </button>
            )}
          </div>
          {query && (
            <p className="text-[11px] text-white/50 mt-1.5">
              命中 {leaderboard.length} 条 · 球面上其他气泡会变暗
            </p>
          )}
        </div>
      </header>

      {/* 球 */}
      <div className="relative flex items-center justify-center mt-2">
        <div
          ref={sceneRef}
          onPointerDown={addingOpen ? undefined : onPointerDown}
          onPointerMove={addingOpen ? undefined : onPointerMove}
          onPointerUp={addingOpen ? undefined : onPointerUp}
          onPointerCancel={addingOpen ? undefined : onPointerUp}
          className="relative select-none touch-none"
          style={{
            width: dims.size,
            height: dims.size,
            cursor: pointerRef.current.id !== null ? "grabbing" : "grab",
            pointerEvents: addingOpen ? "none" : "auto",
          }}
          aria-hidden={addingOpen}
        >
          {/* 背景光晕 */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(120, 180, 255, 0.10), transparent 70%)",
              filter: "blur(10px)",
            }}
          />
          {products.map((p) => (
            <div
              key={p.id}
              ref={(el) => {
                if (el) bubbleRefs.current.set(p.id, el);
                else bubbleRefs.current.delete(p.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBubbleTap(p);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                doVote(p);
              }}
              className="absolute flex flex-col items-center justify-center rounded-full border backdrop-blur-sm will-change-transform text-center leading-tight transition-transform duration-150"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "4px",
                transformOrigin: "center",
              }}
            >
              <span className="font-semibold line-clamp-2 break-words px-1" style={{ maxWidth: "90%" }}>
                {p.name}
              </span>
              <span className="text-[10px] font-bold text-white/90 mt-0.5">
                🔥 {p.votes}
              </span>
              {votingId === p.id && (
                <Loader2 size={12} className="absolute top-1 right-1 animate-spin text-white/80" />
              )}
            </div>
          ))}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white/60" />
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
              还没有商品，点右上角「加商品」开始 →
            </div>
          )}
        </div>
      </div>

      {/* 操作提示 */}
      <div className="max-w-4xl mx-auto px-4 mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1"><Info size={11} />拖拽旋转</span>
        <span className="inline-flex items-center gap-1">· 单击气泡查看</span>
        <span className="inline-flex items-center gap-1">· 双击投票</span>
        <span className="inline-flex items-center gap-1">· 每商品 24h 限 1 票</span>
      </div>

      {/* 排行榜 */}
      <section className="max-w-4xl mx-auto px-4 mt-6 pb-10">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-yellow-400" />
          <h2 className="text-sm font-bold">需求热度榜 Top {leaderboard.length}</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden divide-y divide-white/5">
          {leaderboard.length === 0 ? (
            <p className="px-4 py-6 text-center text-white/50 text-sm">没有匹配结果</p>
          ) : (
            leaderboard.map((p, i) => {
              const c = colorFromVotes(p.votes);
              return (
                <button
                  key={p.id}
                  onClick={() => doVote(p)}
                  disabled={votingId === p.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] disabled:opacity-60 transition text-left"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : i === 1
                          ? "bg-slate-300 text-slate-800"
                          : i === 2
                            ? "bg-amber-500 text-amber-50"
                            : "bg-white/10 text-white/80"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: c.text, background: c.bg, boxShadow: `0 0 10px ${c.glow}` }}
                  >
                    🔥 {p.votes}
                  </span>
                  <span className="text-[10px] text-white/40">+1</span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 加商品 modal */}
      {addingOpen && (
        <AddProductModal
          onClose={() => setAddingOpen(false)}
          onAdded={async () => {
            setAddingOpen(false);
            await reload();
            setToast({ text: "新商品已上球 ✨", type: "ok" });
          }}
          onToast={(t, type) => setToast({ text: t, type })}
        />
      )}

      {/* Toast */}
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

function AddProductModal({
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

  // 打开时锁 body 滚动 + 监听 Esc 关闭，离开时解锁
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
      onToast("请输入商品名", "warn");
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#050816]/95 backdrop-blur-md p-0 sm:p-4 overscroll-contain"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div
        className="w-full sm:max-w-sm bg-[#121a38] text-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-base font-bold">添加一个商品</h3>
          <button onClick={onClose} aria-label="关闭" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs text-white/60">商品名称（≤24 字）</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="例如：冲牙器、电推子、卫生巾…"
            maxLength={24}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder-white/30 focus:outline-none focus:border-sky-400"
          />
          <p className="text-[11px] text-white/50">提交后立即出现在球面上，用户可以给它投票提升热度。</p>
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-400 to-rose-500 text-white text-sm font-bold rounded-xl disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            加到球上
          </button>
        </div>
      </div>
    </div>
  );
}
