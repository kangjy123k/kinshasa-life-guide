"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Lock, Globe2, X, Loader2 } from "lucide-react";

type RecState = "idle" | "recording" | "ready" | "uploading" | "error";

const REGION_OPTIONS = ["法国", "比利时", "刚果", "中国", "其他"];
const GENDER_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "男", label: "男" },
  { key: "女", label: "女" },
];

const MAX_SECONDS = 15;

// 跟 SpeakButton 一致：iOS 解锁需要的 44 字节静音 WAV
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=";

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const cands = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const c of cands) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* old engines throw — keep trying */
    }
  }
  return "";
}

export function FwodRecorderSheet({
  date,
  word,
  target,
  targetText,
  onClose,
  onUploaded,
}: {
  date: string;
  word: string;
  target: "word" | "example";
  targetText: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [state, setState] = useState<RecState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    return () => {
      // 退出时收尾：停录、释放 stream、撤 ObjectURL
      stopTicking();
      try {
        recorderRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTicking = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const close = () => {
    setShown(false);
    window.setTimeout(onClose, 220);
  };

  const startRecord = async () => {
    setErrorMsg(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("当前浏览器不支持录音");
      setState("error");
      return;
    }
    const mime = pickMime();
    if (mime === null) {
      setErrorMsg("当前浏览器不支持 MediaRecorder");
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mimeRef.current = mime || rec.mimeType || "audio/webm";
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setState("ready");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
      setSeconds(0);
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) {
            // 自动停
            try {
              rec.stop();
            } catch {}
            stopTicking();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      console.error("getUserMedia failed:", e);
      setErrorMsg("无法开始录音，请允许麦克风权限");
      setState("error");
    }
  };

  const stopRecord = () => {
    stopTicking();
    try {
      recorderRef.current?.stop();
    } catch {}
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    blobRef.current = null;
    setPreviewUrl(null);
    setSeconds(0);
    setState("idle");
    setErrorMsg(null);
  };

  const togglePreview = async () => {
    if (!previewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const a = audioRef.current;
    if (previewing) {
      a.pause();
      setPreviewing(false);
      return;
    }
    if (!unlockedRef.current) {
      try {
        a.muted = true;
        a.src = SILENT_WAV;
        const p = a.play();
        if (p && typeof p.then === "function") await p.catch(() => {});
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        unlockedRef.current = true;
      } catch {}
    }
    a.src = previewUrl;
    a.onended = () => setPreviewing(false);
    a.onerror = () => setPreviewing(false);
    try {
      await a.play();
      setPreviewing(true);
    } catch (e) {
      console.error("preview play failed:", e);
      setPreviewing(false);
    }
  };

  const upload = async (visibility: "private" | "pending") => {
    if (!blobRef.current) return;
    setState("uploading");
    setErrorMsg(null);
    try {
      const fd = new FormData();
      const ext = mimeRef.current.includes("mp4")
        ? "m4a"
        : mimeRef.current.includes("ogg")
        ? "ogg"
        : "webm";
      fd.append("file", new File([blobRef.current], `rec.${ext}`, { type: mimeRef.current }));
      fd.append("date", date);
      fd.append("word", word);
      fd.append("target", target);
      fd.append("visibility", visibility);
      if (gender) fd.append("gender", gender);
      if (region) fd.append("region", region);
      const res = await fetch("/api/fwod/recording", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      onUploaded();
      close();
    } catch (e) {
      console.error("upload recording failed:", e);
      setErrorMsg(e instanceof Error ? e.message : "上传失败");
      setState("ready");
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      <div
        className={`w-full max-w-md bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-6 transition-transform duration-220 ${
          shown ? "translate-y-0" : "translate-y-6"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-800">
            {target === "word" ? "录单词" : "录例句"}
          </h3>
          <button
            type="button"
            onClick={close}
            aria-label="关闭"
            className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[13px] text-gray-700 leading-snug bg-rose-50 rounded-2xl px-3 py-2">
          <span className="font-semibold text-gray-900">{targetText}</span>
        </p>

        {/* 录音区 */}
        <div className="mt-4">
          {state === "idle" && (
            <button
              type="button"
              onClick={startRecord}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow-sm active:scale-95 transition"
            >
              <Mic size={16} /> 按住前请深吸一口气，点击开始录音
            </button>
          )}
          {state === "recording" && (
            <button
              type="button"
              onClick={stopRecord}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold shadow-sm active:scale-95 transition animate-pulse"
            >
              <Square size={14} fill="currentColor" /> 停止 · {seconds}s / {MAX_SECONDS}s
            </button>
          )}
          {(state === "ready" || state === "uploading") && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePreview}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-sky-100 text-sky-700 text-sm font-semibold active:scale-95 transition"
              >
                {previewing ? <Pause size={14} /> : <Play size={14} />}
                {previewing ? "暂停" : "试听"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold active:scale-95 transition"
              >
                <RotateCcw size={14} /> 重录
              </button>
            </div>
          )}
          {state === "error" && (
            <button
              type="button"
              onClick={reset}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold"
            >
              <RotateCcw size={14} /> 再试一次
            </button>
          )}
        </div>

        {errorMsg && (
          <p className="mt-2 text-[11px] text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">
            {errorMsg}
          </p>
        )}

        {/* 元信息 */}
        {state === "ready" && (
          <div className="mt-4 space-y-2.5">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1">性别（可选）</p>
              <div className="flex gap-1.5">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGender(gender === g.key ? "" : g.key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      gender === g.key
                        ? "bg-rose-500 text-white border-rose-500"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1">地区（可选）</p>
              <div className="flex flex-wrap gap-1.5">
                {REGION_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(region === r ? "" : r)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      region === r
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 提交：私有 / 公开 */}
        {state === "ready" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => upload("private")}
              className="inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold active:scale-95 transition"
            >
              <Lock size={14} /> 私有保存
            </button>
            <button
              type="button"
              onClick={() => upload("pending")}
              className="inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-sm active:scale-95 transition"
            >
              <Globe2 size={14} /> 提交审核公开
            </button>
          </div>
        )}
        {state === "uploading" && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin" /> 上传中…
          </p>
        )}

        <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
          私有保存：只有你自己能听见。<br />
          提交审核：通过后所有人能听并可点赞。
        </p>
      </div>
    </div>
  );
}
