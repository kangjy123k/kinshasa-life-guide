"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Download } from "lucide-react";
import QRCode from "qrcode";

const STORAGE_KEY = "klg-share-fab-pos";
const TAB_SIZE = 56;
const EDGE_MARGIN = 8;

type Pos = { side: "left" | "right"; y: number } | null;

export function ShareFab() {
  const [pos, setPos] = useState<Pos>(null);
  // 拖拽态：dragging=true 时切换成圆形跟随指针；松手后 snap 到边做回半圆
  const [dragging, setDragging] = useState(false);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
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

  // 打开对话框时生成二维码（指向当前站点首页）
  useEffect(() => {
    if (!dialogOpen || qrDataUrl) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch((e) => console.error("[ShareFab] qr gen failed", e));
  }, [dialogOpen, qrDataUrl]);

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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-base font-bold text-gray-800">分享小程序</h3>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                aria-label="关闭"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="px-5 pb-5 flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/share.png"
                alt="刚果金华人生活服务指南"
                className="w-40 rounded-xl shadow-md"
                draggable={false}
              />

              <button
                type="button"
                onClick={triggerSave}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white text-sm font-bold shadow-md active:scale-[0.98] transition"
              >
                <Download size={16} /> 保存到相册
              </button>

              <div className="w-full flex flex-col items-center gap-1 pt-1 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">扫码直接进入小程序</p>
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrDataUrl}
                    alt="小程序链接二维码"
                    className="w-36 h-36"
                    draggable={false}
                  />
                ) : (
                  <div className="w-36 h-36 rounded-lg bg-gray-100 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
