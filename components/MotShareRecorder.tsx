"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Share2, Download, RotateCcw, Loader2, Play, Video, X } from "lucide-react";
import type { FrenchDailyEntry } from "@/lib/french-word-of-the-day";
import {
  composeShareVideo,
  decodeAudio,
  downloadBlob,
  pickVideoMime,
  shareVideoFile,
} from "@/lib/share-video";

type Phase =
  | "idle"
  | "permission"
  | "ready"
  | "recording"
  | "previewUser"
  | "composing"
  | "done"
  | "error";

const MAX_RECORD_MS = 6_000;
const MIN_RECORD_MS = 600;

export function MotShareRecorder({
  entry,
  onClose,
}: {
  entry: FrenchDailyEntry;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [userBlob, setUserBlob] = useState<Blob | null>(null);
  const [userUrl, setUserUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordTimeMs, setRecordTimeMs] = useState(0);
  const [shareDone, setShareDone] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const stopGuardRef = useRef<number | null>(null);

  // 进入即检查浏览器是否支持
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const supportsMic = !!navigator.mediaDevices?.getUserMedia;
    const supportsRec = pickVideoMime() !== null;
    if (!supportsMic) {
      setError("浏览器不支持麦克风录音（请用 Safari/Chrome 打开，不要在微信内置浏览器里）");
      setPhase("error");
    } else if (!supportsRec) {
      setError("当前浏览器不支持视频录制（请升级到最新版 Safari / Chrome）");
      setPhase("error");
    }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (stopGuardRef.current) {
      window.clearTimeout(stopGuardRef.current);
      stopGuardRef.current = null;
    }
  }, []);

  // 卸载清理
  useEffect(() => {
    return () => {
      cleanupStream();
      if (userUrl) URL.revokeObjectURL(userUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setPhase("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      streamRef.current = stream;

      // pick mime that audio recording supports
      const audCands = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];
      let mime = "";
      for (const m of audCands) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
          mime = m;
          break;
        }
      }
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const url = URL.createObjectURL(blob);
        setUserBlob(blob);
        setUserUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        cleanupStream();
        setPhase("previewUser");
      };
      recorder.start();
      recordStartRef.current = performance.now();
      setRecordTimeMs(0);
      recordTimerRef.current = window.setInterval(() => {
        const dt = performance.now() - recordStartRef.current;
        setRecordTimeMs(dt);
      }, 80);
      // 自动到达上限就 stop
      stopGuardRef.current = window.setTimeout(() => {
        try { recorder.stop(); } catch { /* 已 stop */ }
      }, MAX_RECORD_MS);
      setPhase("recording");
    } catch (e) {
      console.error("[MotShareRecorder] mic perm failed", e);
      setError("麦克风未授权或被占用，请在浏览器设置里允许");
      setPhase("error");
      cleanupStream();
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    const dt = performance.now() - recordStartRef.current;
    if (dt < MIN_RECORD_MS) {
      // 太短，提示再录
      return;
    }
    try { recorderRef.current?.stop(); } catch { /* 已 stop */ }
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (stopGuardRef.current) {
      window.clearTimeout(stopGuardRef.current);
      stopGuardRef.current = null;
    }
  }, []);

  const restart = useCallback(() => {
    setError(null);
    if (userUrl) URL.revokeObjectURL(userUrl);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setUserUrl(null);
    setUserBlob(null);
    setVideoUrl(null);
    setVideoBlob(null);
    setShareDone(false);
    setPhase("idle");
  }, [userUrl, videoUrl]);

  const compose = useCallback(async () => {
    if (!userBlob) return;
    setError(null);
    setPhase("composing");
    let ac: AudioContext | null = null;
    try {
      // 拉原版 TTS
      const ttsRes = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: entry.word, cacheKey: `fwod-${entry.word}` }),
      });
      if (!ttsRes.ok) throw new Error("TTS 拉取失败");
      const ttsBlob = await ttsRes.blob();

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
      if (ac.state === "suspended") {
        try { await ac.resume(); } catch { /* */ }
      }
      const userBuf = await decodeAudio(ac, userBlob);
      const origBuf = await decodeAudio(ac, ttsBlob);

      const result = await composeShareVideo({
        word: entry.word,
        zh: entry.zh,
        pron: entry.pron,
        pos: entry.pos,
        date: entry.date,
        imageUrl: entry.image,
        userAudio: userBuf,
        originalAudio: origBuf,
      });
      setVideoBlob(result.blob);
      const url = URL.createObjectURL(result.blob);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setPhase("done");
    } catch (e) {
      console.error("[MotShareRecorder] compose failed", e);
      setError(`视频合成失败：${e instanceof Error ? e.message : "请重试"}`);
      setPhase("error");
    } finally {
      ac?.close().catch(() => {});
    }
  }, [userBlob, entry]);

  const filename = `${entry.word}-法语-${entry.date}${(videoBlob?.type ?? "").includes("mp4") ? ".mp4" : ".webm"}`;

  const onShare = useCallback(async () => {
    if (!videoBlob) return;
    setShareDone(false);
    const ok = await shareVideoFile(
      videoBlob,
      filename,
      `每日法语一词｜${entry.word}（${entry.zh}）— 来自 @刚果金华人生活指南`,
    );
    if (ok) setShareDone(true);
    else downloadBlob(videoBlob, filename);
  }, [videoBlob, filename, entry]);

  const onDownload = useCallback(() => {
    if (!videoBlob) return;
    downloadBlob(videoBlob, filename);
  }, [videoBlob, filename]);

  const tooShort = phase === "recording" && recordTimeMs < MIN_RECORD_MS;
  const recPct = Math.min(100, (recordTimeMs / MAX_RECORD_MS) * 100);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-white px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Video size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold">录朋友圈视频</h3>
            <p className="text-[11px] text-white/85 mt-0.5 truncate">
              {entry.word}（{entry.zh}）· 你来一遍 + 原版一遍
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* 阶段：idle / permission */}
          {(phase === "idle" || phase === "permission") && (
            <div className="space-y-4">
              <ol className="text-[13px] text-gray-700 space-y-1.5 leading-snug">
                <li>1. 按住下方按钮录你自己的法语发音（最多 {MAX_RECORD_MS / 1000} 秒）</li>
                <li>2. 我们自动拼上原版 + 单词卡 + 水印，做成一段视频</li>
                <li>3. 一键分享到朋友圈，悄悄学，惊艳所有人</li>
              </ol>
              <button
                type="button"
                onClick={startRecording}
                disabled={phase === "permission"}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow active:scale-95 transition disabled:opacity-60"
              >
                {phase === "permission" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 请求麦克风…
                  </>
                ) : (
                  <>
                    <Mic size={16} /> 开始录音
                  </>
                )}
              </button>
            </div>
          )}

          {/* 阶段：recording */}
          {phase === "recording" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  录音中 · {(recordTimeMs / 1000).toFixed(1)}s
                </div>
                <p className="mt-3 text-base font-bold text-gray-800">
                  请念：<span className="text-rose-600">{entry.word}</span>
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5">近似读音 {entry.pron}</p>
              </div>
              <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-[width] duration-100"
                  style={{ width: `${recPct}%` }}
                />
              </div>
              <button
                type="button"
                onClick={stopRecording}
                disabled={tooShort}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold active:scale-95 transition disabled:opacity-50"
              >
                <Square size={14} fill="currentColor" /> {tooShort ? "再多录一会儿…" : "完成"}
              </button>
            </div>
          )}

          {/* 阶段：previewUser */}
          {phase === "previewUser" && userUrl && (
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-700">
                听一下自己的发音，满意就合成视频
              </div>
              <audio src={userUrl} controls className="w-full" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:scale-95 transition"
                >
                  <RotateCcw size={14} /> 重录
                </button>
                <button
                  type="button"
                  onClick={compose}
                  className="flex-[2] inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow active:scale-95 transition"
                >
                  <Play size={14} fill="currentColor" /> 合成视频
                </button>
              </div>
            </div>
          )}

          {/* 阶段：composing */}
          {phase === "composing" && (
            <div className="py-8 text-center space-y-3">
              <Loader2 size={32} className="mx-auto animate-spin text-rose-500" />
              <p className="text-sm text-gray-700 font-semibold">视频合成中…</p>
              <p className="text-[11px] text-gray-500">
                正在拼接你的发音 + 法语原版 + 水印
                <br />
                大约需要 {(((entry.word?.length ?? 4) + 6) * 0.4).toFixed(0)} 秒
              </p>
            </div>
          )}

          {/* 阶段：done */}
          {phase === "done" && videoUrl && (
            <div className="space-y-4">
              <video
                src={videoUrl}
                controls
                playsInline
                className="w-full rounded-2xl border border-rose-100 bg-black aspect-[9/16] max-h-[60vh]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:scale-95 transition"
                >
                  <RotateCcw size={14} /> 重做
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow active:scale-95 transition"
                >
                  <Share2 size={14} /> {shareDone ? "已分享" : "分享"}
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-sm font-semibold active:scale-95 transition"
                >
                  <Download size={14} /> 下载
                </button>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                视频里已自带 <b>@刚果金华人生活指南</b> 水印。
                <br />
                微信内置浏览器分享受限，建议<b>下载到相册</b> → 打开微信 → 朋友圈 → 拍照按钮选视频上传。
              </p>
            </div>
          )}

          {/* 错误 */}
          {phase === "error" && error && (
            <div className="space-y-3">
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-3 text-sm text-red-700 leading-snug">
                {error}
              </div>
              <button
                type="button"
                onClick={restart}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold active:scale-95 transition"
              >
                <RotateCcw size={14} /> 重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
