"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function SheetModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 260);
      return true;
    });
  };

  if (!mounted) return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-opacity duration-300 ease-out ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        handleClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-out w-screen h-[100dvh] max-w-none rounded-none sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl ${
          closing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-[17px] font-black text-black flex-1 min-w-0 truncate tracking-tight">
            {title}
          </h3>
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="w-8 h-8 -mr-1 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-95 transition"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className="px-5 pt-3 border-t border-gray-100 shrink-0 bg-white"
            style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
