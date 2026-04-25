/**
 * 录音 + 原版 TTS → 朋友圈视频合成。
 *
 * 实现方案：
 *   - 用 AudioContext 把"用户录音"和"原版TTS"两段 AudioBuffer 顺序播放进
 *     MediaStreamAudioDestinationNode → 拿到一条音轨
 *   - 用 Canvas 实时绘制（每 33ms 一帧），captureStream() 拿到一条视频轨
 *   - 把两条轨合并喂给 MediaRecorder，得到 webm/mp4 Blob
 *
 * 注意：
 *   - 任何步骤失败要保证麦克风/AudioContext 正确释放
 *   - 视频尺寸 720x1280 竖屏，朋友圈/小红书友好
 *   - 失败只 console，不弹 alert（按用户偏好）
 */

const VIDEO_W = 720;
const VIDEO_H = 1280;
const FPS = 30;
const GAP_S = 0.45; // 原版和用户录音之间的留白

const BRAND = "@刚果金华人生活指南";
const QR_SRC = "/mini-program-qr.png";

export interface ComposeInput {
  word: string;
  zh: string;
  pron: string;
  pos: string;
  date: string;       // YYYY-MM-DD
  imageUrl: string;   // /fwod/xxx.webp
  userAudio: AudioBuffer;
  originalAudio: AudioBuffer;
}

export interface ComposeResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

/** 选一个浏览器最可能支持的录像 mime。优先 mp4（iOS / 微信），回落 webm。 */
export function pickVideoMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const cands = [
    "video/mp4;codecs=avc1.42E01F,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of cands) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

/** 把 Blob 解码为 AudioBuffer。AudioContext 由调用方负责创建/释放。 */
export async function decodeAudio(ac: AudioContext, blob: Blob): Promise<AudioBuffer> {
  const arr = await blob.arrayBuffer();
  return await ac.decodeAudioData(arr.slice(0));
}

/** 拉一段图片，等加载完成；用于 canvas 绘图 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function fmtDateZh(d: string): string {
  const [, m, day] = d.split("-");
  return `${Number(m)}月${Number(day)}日`;
}

/**
 * 一帧一帧绘制视频（按时间 t 秒计算应该高亮哪一段）。
 * 顺序：原版法语 → 留白 → 用户发音
 * subtitle: "法语原版" / "你的发音" / ""
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  qr: HTMLImageElement | null,
  input: ComposeInput,
  t: number,
  totalT: number,
  origDur: number,
) {
  const W = VIDEO_W;
  const H = VIDEO_H;

  // 背景渐变（rose → orange → amber，呼应品牌色）
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#fb7185");   // rose-400
  grad.addColorStop(0.55, "#f97316"); // orange-500
  grad.addColorStop(1, "#f59e0b");    // amber-500
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 微微动态：跟着时间慢慢漂移的圆斑（呼吸感）
  const phase = (t / totalT) * Math.PI * 2;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.arc(W * 0.85, 80 + Math.sin(phase) * 14, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.15, H - 90 + Math.cos(phase) * 18, 130, 0, Math.PI * 2);
  ctx.fill();

  // 顶部标签
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 28px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`每日法语一词 · ${fmtDateZh(input.date)}`, W / 2, 70);

  // 释义图卡（白底圆角，里面 contain 适配）
  const cardX = 60, cardY = 110, cardW = W - 120, cardH = 540;
  ctx.fillStyle = "#fff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // 图按 contain 居中
  const padding = 22;
  const innerW = cardW - padding * 2;
  const innerH = cardH - padding * 2;
  const ratio = Math.min(innerW / img.width, innerH / img.height);
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;
  ctx.drawImage(img, cardX + (cardW - drawW) / 2, cardY + (cardH - drawH) / 2, drawW, drawH);

  // 单词（大字）
  ctx.fillStyle = "#fff";
  ctx.font = "900 92px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(input.word, W / 2, cardY + cardH + 110);

  // pos + 中文释义
  ctx.font = "600 36px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(`${input.pos}  ${input.zh}`, W / 2, cardY + cardH + 165);

  // 近似读音（小一点）
  ctx.font = "500 30px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`近似读音 · ${input.pron}`, W / 2, cardY + cardH + 215);

  // 当前阶段提示（法语原版在前，你的发音在后）
  const inOrig = t < origDur;
  const inGap = t >= origDur && t < origDur + GAP_S;
  const stage = inGap ? "" : inOrig ? "🇫🇷  法语原版" : "🎙  你的发音";
  if (stage) {
    const tagY = cardY + cardH + 285;
    ctx.font = "700 32px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
    const text = stage;
    const m = ctx.measureText(text);
    const padX = 28;
    const tagW = m.width + padX * 2;
    const tagX = (W - tagW) / 2;
    const tagH = 56;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(ctx, tagX, tagY - tagH + 12, tagW, tagH, 28);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, W / 2, tagY);
  }

  // 右下角水印：QR + 公众号 ID
  const qrSize = 132;
  const margin = 28;
  const qrX = W - qrSize - margin;
  const qrY = H - qrSize - margin - 38; // 给底下文字留位置
  if (qr) {
    // QR 底白卡（让绿/黑色 QR 不论背景都清晰）
    ctx.fillStyle = "#fff";
    roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 16);
    ctx.fill();
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  }
  // 品牌文字：QR 正下方右对齐
  ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(BRAND, W - margin, H - margin - 4);
  // 重置 textAlign 给下一帧
  ctx.textAlign = "center";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 主合成函数。
 * 流程：
 *   1) 准备 canvas + image + AudioContext + MediaStreamDestination
 *   2) 安排两段 AudioBuffer 顺序播放，连到 destination
 *   3) 把 canvas.captureStream + destination.stream.audioTrack 合并成新 stream
 *   4) MediaRecorder 录到结束 → blob
 */
export async function composeShareVideo(input: ComposeInput): Promise<ComposeResult> {
  const mime = pickVideoMime();
  if (!mime) throw new Error("当前浏览器不支持视频录制");

  const userDur = input.userAudio.duration;
  const origDur = input.originalAudio.duration;
  const totalDur = origDur + GAP_S + userDur + 0.25; // 顺序：原版 → 留白 → 用户

  // canvas
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 不可用");

  const img = await loadImage(input.imageUrl);
  // QR 失败不致命，没就不画
  let qr: HTMLImageElement | null = null;
  try {
    qr = await loadImage(QR_SRC);
  } catch {
    qr = null;
  }

  // AudioContext
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  // iOS Safari 需要 resume
  if (ac.state === "suspended") {
    try { await ac.resume(); } catch { /* 忽略 */ }
  }

  const dest = ac.createMediaStreamDestination();
  const userSrc = ac.createBufferSource();
  userSrc.buffer = input.userAudio;
  userSrc.connect(dest);
  const origSrc = ac.createBufferSource();
  origSrc.buffer = input.originalAudio;
  origSrc.connect(dest);

  // captureStream
  type CanvasWithCapture = HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
  const c = canvas as CanvasWithCapture;
  if (typeof c.captureStream !== "function") {
    ac.close().catch(() => {});
    throw new Error("当前浏览器不支持 canvas.captureStream");
  }
  const videoStream = c.captureStream(FPS);
  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  // 先画一帧，避免首帧空白
  drawFrame(ctx, img, qr, input, 0, totalDur, origDur);

  const startWall = performance.now();
  let raf = 0;
  const tick = () => {
    const t = (performance.now() - startWall) / 1000;
    drawFrame(ctx, img, qr, input, Math.min(t, totalDur), totalDur, origDur);
    if (t < totalDur) {
      raf = requestAnimationFrame(tick);
    }
  };

  return await new Promise<ComposeResult>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      cancelAnimationFrame(raf);
      try { videoStream.getTracks().forEach((t) => t.stop()); } catch {}
      try { dest.stream.getTracks().forEach((t) => t.stop()); } catch {}
      ac.close().catch(() => {});
    };

    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const blob = new Blob(chunks, { type: mime });
      resolve({ blob, mimeType: mime, durationMs: Math.round(totalDur * 1000) });
    };
    recorder.onerror = (e) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(e);
    };

    try {
      recorder.start(200);
      raf = requestAnimationFrame(tick);
      // 安排音频：原版在前，用户在后
      const now = ac.currentTime + 0.05;
      origSrc.start(now);
      userSrc.start(now + origDur + GAP_S);
      // 录到结束 + 微小缓冲
      window.setTimeout(() => {
        try { recorder.stop(); } catch { /* 已 stop */ }
      }, Math.ceil(totalDur * 1000) + 250);
    } catch (e) {
      cleanup();
      reject(e);
    }
  });
}

/** 触发浏览器下载视频 blob */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 0.5s 后再 revoke，给 Safari 一点时间
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

/** 用 Web Share API 分享文件，失败/不支持就回 false 让上层走下载 */
export async function shareVideoFile(blob: Blob, filename: string, text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (typeof nav.share !== "function") return false;
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (nav.canShare && !nav.canShare({ files: [file] })) return false;
    await nav.share({ files: [file], text });
    return true;
  } catch {
    return false;
  }
}

/** 微信内置 X5 浏览器：禁 a[download]、文件 share、blob URL 长按保存。
 *  解法：把视频上传到我们自己的 /api/upload（落 Turso，零 Blob 消耗），
 *  再用 /api/media/{id}.mp4 真实 URL 喂给 <video>，X5 可长按"保存视频"。*/
export function isWeChat(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent || "");
}

/** 上传视频 blob 到 /api/upload，返回带扩展名的可分享 URL */
export async function uploadVideoToServer(blob: Blob): Promise<string> {
  // 强制把 mime 主类型对齐到 mp4 / webm（X5 / 服务端只识别这俩）
  const baseMime = (blob.type || "").split(";")[0] || "video/webm";
  const finalBlob = new Blob([blob], { type: baseMime });
  const ext = baseMime === "video/mp4" ? "mp4" : "webm";
  const file = new File([finalBlob], `mot.${ext}`, { type: baseMime });
  const fd = new FormData();
  fd.append("file", file);
  fd.append("scope", "fwod-share");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`upload failed: HTTP ${res.status}`);
  const data = (await res.json()) as { ok?: boolean; url?: string };
  if (!data.ok || !data.url) throw new Error("upload response invalid");
  // 给 URL 末尾补扩展名，X5 会把它当视频文件而不是未知资源
  return `${data.url}.${ext}`;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iOS / iPadOS（iPad 在桌面模式下 ua 也算 Mac，但有 maxTouchPoints>1）
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (
    /Mac/i.test(ua) &&
    typeof (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints === "number" &&
    ((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0) > 1
  ) {
    return true;
  }
  return false;
}

/**
 * 真正"存盘"用的统一入口：
 *   - iOS / 支持 file share 的浏览器：弹出系统分享面板，里面"保存视频"直接进相册
 *   - Android / 桌面：触发 <a download> 直接落到下载目录
 * 返回字符串告诉调用方走了哪条路，便于显示对应提示。
 */
export async function saveVideoToDevice(
  blob: Blob,
  filename: string,
): Promise<"sheet" | "download"> {
  // iOS 上 <a download> 不工作，必须走系统分享面板；其它平台先 download 兜底。
  if (typeof navigator !== "undefined") {
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    const file = new File([blob], filename, { type: blob.type });
    const canShareFile = !!nav.canShare && nav.canShare({ files: [file] });
    if (isIOS() && typeof nav.share === "function" && canShareFile) {
      try {
        await nav.share({ files: [file] });
        return "sheet";
      } catch {
        // 用户在弹窗里取消也算流程结束，回 sheet 让 UI 不慌
        return "sheet";
      }
    }
  }
  downloadBlob(blob, filename);
  return "download";
}
