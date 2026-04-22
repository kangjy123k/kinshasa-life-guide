"use client";

import { useEffect, useState } from "react";
import { BANK, todayIndex } from "@/lib/french-word-of-the-day";

const LS_KEY = "fwod-progress-v1";

export function FrenchWordDot({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const todayWord = BANK[todayIndex()].word;
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        setShow(true);
        return;
      }
      const p = JSON.parse(raw) as { learned?: Record<string, string> };
      setShow(!p.learned?.[todayWord]);
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <span
      aria-label="今日未学"
      className={`inline-block w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)] ${className}`}
    />
  );
}
