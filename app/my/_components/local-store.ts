"use client";

import { useEffect, useState } from "react";

const PREFIX = "klg.my.";

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(`klg:my:${key}`));
  } catch {}
}

export function useLocalRecord<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(readJSON(key, fallback));
    const onChange = () => setValue(readJSON(key, fallback));
    window.addEventListener(`klg:my:${key}`, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(`klg:my:${key}`, onChange);
      window.removeEventListener("storage", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (v: T) => {
    setValue(v);
    writeJSON(key, v);
  };

  return [value, update];
}
