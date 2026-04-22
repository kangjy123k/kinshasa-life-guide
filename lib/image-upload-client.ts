// 客户端图片压缩 + 上传 — 移动端手机相册场景
// 目标：长边 ≤ 1600，JPEG 质量 0.82，单张 ≤ 1MB；超过就再降一级

const MAX_EDGE = 1600;
const MIN_EDGE = 720;
const TARGET_BYTES = 900_000;

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToCanvas(
  src: ImageBitmap | HTMLImageElement,
  targetEdge: number,
): HTMLCanvasElement {
  const srcW = "width" in src ? src.width : 0;
  const srcH = "height" in src ? src.height : 0;
  const longest = Math.max(srcW, srcH);
  const scale = longest > targetEdge ? targetEdge / longest : 1;
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context unavailable");
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob empty"))),
      "image/jpeg",
      quality,
    );
  });
}

export async function compressImage(file: File): Promise<Blob> {
  // 非图像或超大 gif / svg 不处理，直接抛
  if (!file.type.startsWith("image/")) {
    throw new Error("not an image");
  }
  const bitmap = await loadBitmap(file);
  let edge = MAX_EDGE;
  let quality = 0.82;
  let blob: Blob = file;
  // 最多 3 轮降级
  for (let i = 0; i < 3; i++) {
    const canvas = drawToCanvas(bitmap, edge);
    blob = await canvasToBlob(canvas, quality);
    if (blob.size <= TARGET_BYTES) break;
    // 先降质量，再降分辨率
    if (quality > 0.6) {
      quality -= 0.12;
    } else if (edge > MIN_EDGE) {
      edge = Math.max(MIN_EDGE, Math.round(edge * 0.8));
    } else {
      break;
    }
  }
  if (typeof (bitmap as ImageBitmap).close === "function") {
    try {
      (bitmap as ImageBitmap).close();
    } catch {
      /* ignore */
    }
  }
  return blob;
}

export interface UploadedImage {
  url: string;
  pathname: string;
}

export async function uploadImage(file: File, scope = "merchant"): Promise<UploadedImage> {
  const blob = await compressImage(file);
  const form = new FormData();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const named = new File([blob], `upload.${ext}`, { type: blob.type });
  form.append("file", named);
  form.append("scope", scope);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `upload failed (${res.status})`);
  }
  const data = (await res.json()) as { url?: string; pathname?: string };
  if (!data.url || !data.pathname) throw new Error("bad response");
  return { url: data.url, pathname: data.pathname };
}
