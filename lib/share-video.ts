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
const GAP_S = 0.45; // 用户录音和原版之间留白

const BRAND = "@刚果金华人生活指南";

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
 * subtitle: "你的发音" / "法语原版" / ""
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  input: ComposeInput,
  t: number,
  totalT: number,
  userDur: number,
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

  // 当前阶段提示（你的发音 / 法语原版）
  const inUser = t < userDur;
  const inGap = t >= userDur && t < userDur + GAP_S;
  const stage = inGap ? "" : inUser ? "🎙  你的发音" : "🇫🇷  法语原版";
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

  // 水印（朋友圈品牌）
  ctx.font = "600 28px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.fillText(BRAND, W / 2, H - 60);
  ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("悄悄学，惊艳所有人", W / 2, H - 30);
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
  const totalDur = userDur + GAP_S + origDur + 0.25; // 末尾留 0.25s 防截尾

  // canvas
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 不可用");

  const img = await loadImage(input.imageUrl);

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
  drawFrame(ctx, img, input, 0, totalDur, userDur);

  const startWall = performance.now();
  let raf = 0;
  const tick = () => {
    const t = (performance.now() - startWall) / 1000;
    drawFrame(ctx, img, input, Math.min(t, totalDur), totalDur, userDur);
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
      // 安排音频
      const now = ac.currentTime + 0.05;
      userSrc.start(now);
      origSrc.start(now + userDur + GAP_S);
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
