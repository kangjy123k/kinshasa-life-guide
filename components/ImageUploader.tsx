"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/image-upload-client";

export function SingleImageUploader({
  value,
  onChange,
  scope = "merchant",
  placeholder = "点击上传图片",
  aspect = "16 / 9",
}: {
  value: string;
  onChange: (url: string) => void;
  scope?: string;
  placeholder?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { url } = await uploadImage(file, scope);
      onChange(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    onChange("");
    setError(null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ aspectRatio: aspect }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="首图预览" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            aria-label="删除图片"
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center active:scale-95 transition"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 text-gray-700 text-[11px] font-semibold shadow active:scale-95"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
            {busy ? "上传中" : "换一张"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center text-gray-500 py-6 active:scale-[0.99] transition"
          style={{ aspectRatio: aspect, minHeight: 120 }}
        >
          {busy ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span className="mt-2 text-xs">上传中…</span>
            </>
          ) : (
            <>
              <ImagePlus size={22} />
              <span className="mt-2 text-xs font-medium">{placeholder}</span>
              <span className="mt-0.5 text-[10px] text-gray-400">从手机相册选择 · 自动压缩</span>
            </>
          )}
        </button>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded-md">{error}</p>
      )}
    </div>
  );
}

export function MultiImageUploader({
  values,
  onChange,
  scope = "merchant",
  max = 12,
  note,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  scope?: string;
  max?: number;
  note?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enter, setEnter] = useState<string[]>([]);

  useEffect(() => {
    // 让新加入的图片有个 fade-in
    setEnter(values);
  }, [values]);

  const openPicker = () => inputRef.current?.click();

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list || list.length === 0) return;
    const remaining = max - values.length;
    if (remaining <= 0) {
      setError(`最多 ${max} 张`);
      return;
    }
    const files = Array.from(list).slice(0, remaining);
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });
    const uploaded: string[] = [];
    try {
      for (const f of files) {
        try {
          const { url } = await uploadImage(f, scope);
          uploaded.push(url);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "部分图片上传失败");
        } finally {
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        }
      }
      if (uploaded.length) onChange([...values, ...uploaded]);
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(null), 400);
    }
  };

  const removeAt = (idx: number) => {
    const next = values.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const canAdd = values.length < max;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div
            key={url}
            className={`relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 transition-opacity duration-300 ${
              enter.includes(url) ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`图片 ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="删除"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center active:scale-95 transition"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center text-gray-500 active:scale-[0.97] transition"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {progress && (
                  <span className="mt-1 text-[10px]">
                    {progress.done}/{progress.total}
                  </span>
                )}
              </>
            ) : (
              <>
                <ImagePlus size={18} />
                <span className="mt-1 text-[10px] font-medium">
                  {values.length === 0 ? "从相册添加" : "再加一张"}
                </span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[10.5px] text-gray-400 leading-relaxed">
        {note ?? `从手机相册选择，支持多选 · 自动压缩 · 最多 ${max} 张`}
      </p>
      {error && (
        <p className="mt-1 text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded-md">{error}</p>
      )}
    </div>
  );
}
