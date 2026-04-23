"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Download } from "lucide-react";

const STORAGE_KEY = "klg-share-fab-pos-v2";
const TAB_SIZE = 56;
const EDGE_MARGIN = 8;

type Pos = { side: "left" | "right"; y: number } | null;

export function ShareFab() {
  const [pos, setPos] = useState<Pos>(null);
  // 拖拽态：dragging=true 时切换成圆形跟随指针；松手后 snap 到边做回半圆
  const [dragging, setDragging] = useState(false);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dragRef = useRef({ px: 0, py: 0, startX: 0, startY: 0, moved: false });

  // 初始定位：优先读 storage；否则默认 "首页蓝色 hero 右下角" —— 通过锚点元素定位
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clamp = (y: number) =>
      Math.max(EDGE_MARGIN, Math.min(window.innerHeight - TAB_SIZE - EDGE_MARGIN - 80, y));

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if ((p.side === "left" || p.side === "right") && typeof p.y === "number") {
          setPos({ side: p.side, y: clamp(p.y) });
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const anchor = document.getElementById("klg-share-anchor");
    const y = anchor ? clamp(anchor.getBoundingClientRect().top - TAB_SIZE / 2) : 220;
    setPos({ side: "right", y });
  }, []);

  useEffect(() => {
    if (!pos) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX =
      pos.side === "left" ? EDGE_MARGIN : window.innerWidth - TAB_SIZE - EDGE_MARGIN;
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      startX,
      startY: pos.y,
      moved: false,
    };
    setDragging(true);
    setDragXY({ x: startX, y: pos.y });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.px;
    const dy = e.clientY - dragRef.current.py;
    if (!dragRef.current.moved && Math.hypot(dx, dy) > 8) {
      dragRef.current.moved = true;
    }
    if (dragRef.current.moved) {
      setDragXY({
        x: Math.max(
          EDGE_MARGIN,
          Math.min(window.innerWidth - TAB_SIZE - EDGE_MARGIN, dragRef.current.startX + dx),
        ),
        y: Math.max(
          EDGE_MARGIN,
          Math.min(window.innerHeight - TAB_SIZE - EDGE_MARGIN - 80, dragRef.current.startY + dy),
        ),
      });
    }
  };

  const onPointerUp = () => {
    const moved = dragRef.current.moved;
    setDragging(false);
    if (!moved) {
      setDragXY(null);
      setDialogOpen(true);
      return;
    }
    if (!dragXY) return;
    const centerX = dragXY.x + TAB_SIZE / 2;
    const snapSide: "left" | "right" = centerX < window.innerWidth / 2 ? "left" : "right";
    setPos({ side: snapSide, y: dragXY.y });
    setDragXY(null);
  };

  const triggerSave = useCallback(async () => {
    try {
      const res = await fetch("/share.png");
      const blob = await res.blob();
      const file = new File([blob], "刚果金华人生活服务指南.png", { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        navigator.canShare?.({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title: "刚果金华人生活服务指南" });
          return;
        } catch {
          /* 用户取消或不支持 → 回落下载 */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "刚果金华人生活服务指南.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error("[ShareFab] save failed", e);
    }
  }, []);

  if (!pos) return null;

  // ---- 视觉定位 ----
  // 静止：贴边半圆（right: 0 或 left: 0，负圆角掩藏另一半）
  // 拖拽：整圆跟随手指
  const showingCircle = dragging && dragXY;
  const circleStyle: React.CSSProperties = showingCircle
    ? {
        position: "fixed",
        left: dragXY!.x,
        top: dragXY!.y,
        width: TAB_SIZE,
        height: TAB_SIZE,
        borderRadius: "9999px",
        touchAction: "none",
        transition: "none",
      }
    : {
        position: "fixed",
        [pos.side]: 0,
        top: pos.y,
        width: TAB_SIZE * 0.62,
        height: TAB_SIZE,
        borderTopLeftRadius: pos.side === "right" ? "9999px" : 0,
        borderBottomLeftRadius: pos.side === "right" ? "9999px" : 0,
        borderTopRightRadius: pos.side === "left" ? "9999px" : 0,
        borderBottomRightRadius: pos.side === "left" ? "9999px" : 0,
        touchAction: "none",
        transition: "top 0.25s cubic-bezier(.2,.8,.3,1)",
      } as React.CSSProperties;

  return (
    <>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={circleStyle}
        className="z-40 bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-400/40 flex items-center justify-center select-none active:brightness-95"
        aria-label="分享小程序海报"
      >
        <span className="text-[13px] font-black tracking-widest leading-none">分享</span>
      </button>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-3"
          onClick={() => setDialogOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDialogOpen(false);
            }}
            aria-label="关闭"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur"
          >
            <X size={18} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/share.png"
            alt="刚果金华人生活服务指南"
            className="max-h-[80vh] max-w-full w-auto rounded-xl shadow-2xl"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerSave();
            }}
            className="mt-4 inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white text-sm font-bold shadow-xl active:scale-[0.98] transition"
          >
            <Download size={16} /> 保存到相册
          </button>
        </div>
      )}
    </>
  );
}
