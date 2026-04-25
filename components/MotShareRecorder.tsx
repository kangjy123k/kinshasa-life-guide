"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Download, RotateCcw, Loader2, Play, Video, X } from "lucide-react";
import type { FrenchDailyEntry } from "@/lib/french-word-of-the-day";
import {
  composeShareVideo,
  decodeAudio,
  downloadBlob,
  isWeChat,
  pickVideoMime,
  saveVideoToDevice,
  uploadVideoToServer,
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
  // 微信里需要把 blob 上传成真实 URL，X5 才肯长按存视频
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recordTimeMs, setRecordTimeMs] = useState(0);

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
    setServerUrl(null);
    setUploading(false);
    setUploadError(null);
    setPhase("idle");
  }, [userUrl, videoUrl]);

  const retryUpload = useCallback(async () => {
    if (!videoBlob) return;
    setUploading(true);
    setUploadError(null);
    try {
      const remote = await uploadVideoToServer(videoBlob);
      setServerUrl(remote);
    } catch (err) {
      console.error("[MotShareRecorder] retry upload failed", err);
      setUploadError("上传失败，请检查网络再点重试");
    } finally {
      setUploading(false);
    }
  }, [videoBlob]);

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
      // 微信内置浏览器：blob URL 长按不能存，需要上传换成真实 URL
      if (isWeChat()) {
        setUploading(true);
        setUploadError(null);
        try {
          const remote = await uploadVideoToServer(result.blob);
          setServerUrl(remote);
        } catch (err) {
          console.error("[MotShareRecorder] upload failed", err);
          setUploadError("上传失败，请检查网络再点重试");
        } finally {
          setUploading(false);
        }
      }
    } catch (e) {
      console.error("[MotShareRecorder] compose failed", e);
      setError(`视频合成失败：${e instanceof Error ? e.message : "请重试"}`);
      setPhase("error");
    } finally {
      ac?.close().catch(() => {});
    }
  }, [userBlob, entry]);

  const filename = `${entry.word}-法语-${entry.date}${(videoBlob?.type ?? "").includes("mp4") ? ".mp4" : ".webm"}`;

  const [saveHint, setSaveHint] = useState<"sheet" | "download" | null>(null);
  const inWeChat = typeof window !== "undefined" && isWeChat();
  const onSave = useCallback(async () => {
    if (!videoBlob) return;
    const how = await saveVideoToDevice(videoBlob, filename);
    setSaveHint(how);
  }, [videoBlob, filename]);
  // 兜底：系统弹窗都用不了时，仍可强行触发 a[download]
  const onForceDownload = useCallback(() => {
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
                <li>1. 按下方按钮录你自己的法语发音（最多 {MAX_RECORD_MS / 1000} 秒）</li>
                <li>2. 我们自动拼上原版法语和单词卡，做成一段竖屏视频</li>
                <li>3. 下载到相册，发朋友圈，悄悄学惊艳所有人</li>
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
                正在拼接你的发音 + 法语原版
                <br />
                大约需要 {(((entry.word?.length ?? 4) + 6) * 0.4).toFixed(0)} 秒
              </p>
            </div>
          )}

          {/* 阶段：done */}
          {phase === "done" && videoUrl && (
            <div className="space-y-4">
              {inWeChat ? (
                /* 微信路径：等上传完，用真实 URL 喂 video，X5 才肯长按存 */
                <>
                  {serverUrl ? (
                    <video
                      src={serverUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-2xl border border-rose-100 bg-black aspect-[9/16] max-h-[60vh]"
                    />
                  ) : (
                    <div className="w-full rounded-2xl border border-rose-100 bg-black aspect-[9/16] max-h-[60vh] flex flex-col items-center justify-center text-white/85 gap-2 px-4 text-center">
                      {uploading ? (
                        <>
                          <Loader2 size={28} className="animate-spin text-rose-300" />
                          <p className="text-sm font-semibold">视频上传中…</p>
                          <p className="text-[11px] text-white/60">
                            上传完成后才能长按保存到相册
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">{uploadError ?? "上传失败"}</p>
                          <button
                            type="button"
                            onClick={retryUpload}
                            className="mt-1 px-4 py-2 rounded-xl bg-white text-rose-600 text-xs font-bold active:scale-95 transition"
                          >
                            重试上传
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-3 text-[12px] text-rose-800 leading-relaxed">
                    <p className="font-bold">两步存到相册：</p>
                    <p className="mt-1 text-rose-700">
                      1. 点下面 <b>「打开视频页」</b> 跳到全屏播放器
                      <br />
                      2. 在播放页 <b>右上角「···」</b> → 选 <b>「保存视频到本地」</b>
                    </p>
                    <p className="mt-1 text-rose-500 text-[11px]">
                      （直接长按视频不一定有"保存"，必须先跳到全屏播放器）
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={restart}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:scale-95 transition"
                    >
                      <RotateCcw size={14} /> 重做
                    </button>
                    {serverUrl && (
                      <a
                        href={serverUrl}
                        target="_blank"
                        rel="noopener"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow active:scale-95 transition"
                      >
                        <Download size={14} /> 打开视频页
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                      onClick={onSave}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow active:scale-95 transition"
                    >
                      <Download size={14} /> 保存到相册
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    {saveHint === "sheet"
                      ? "在弹出的菜单里选「保存视频」/「Save Video」即可存到相册。"
                      : saveHint === "download"
                      ? "已下载到「下载」目录，去相册里就能看到。"
                      : "iPhone 会弹出系统菜单，里面选「保存视频」。Android 会直接存到下载文件夹。"}
                  </p>
                  {saveHint === null && (
                    <button
                      type="button"
                      onClick={onForceDownload}
                      className="w-full text-[11px] text-gray-500 underline underline-offset-2 active:text-gray-700"
                    >
                      没反应？点这里强制下载
                    </button>
                  )}
                </>
              )}
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
