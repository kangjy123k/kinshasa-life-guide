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
      (b) => {
        if (b) return resolve(b);
        // 微信 X5 WebView 的 toBlob 有时返回 null，用 toDataURL 兜底
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const comma = dataUrl.indexOf(",");
          if (comma === -1) throw new Error("bad dataURL");
          const bin = atob(dataUrl.slice(comma + 1));
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: "image/jpeg" }));
        } catch (e) {
          reject(new Error("图片编码失败，请重试或换一张"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

// 某些微信 Android WebView 从"图库"选图时返回的 File 没有 mime（或 octet-stream），
// 按文件名后缀兜底识别，避免上传第一步就被挡掉。
function looksLikeImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name || "");
}

export async function compressImage(file: File): Promise<Blob> {
  if (!looksLikeImage(file)) {
    throw new Error("请选择图片文件");
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
  let blob: Blob;
  try {
    blob = await compressImage(file);
  } catch (e) {
    // 压缩失败时兜底：如果原图本身就在 1.5MB 以内且是合法 mime，直接原图上传
    // 主要是给微信 X5 在 canvas 异常时留条活路
    const mime = file.type || "";
    const underCap = file.size > 0 && file.size <= 1_400_000;
    if (underCap && /^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {
      console.warn("[upload] compress failed, sending original", e);
      blob = file;
    } else {
      throw e;
    }
  }

  const form = new FormData();
  const mimeOut = (blob.type && blob.type.startsWith("image/")) ? blob.type : "image/jpeg";
  const ext = mimeOut === "image/png" ? "png" : mimeOut === "image/webp" ? "webp" : "jpg";
  const named = new File([blob], `upload.${ext}`, { type: mimeOut });
  form.append("file", named);
  form.append("scope", scope);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: form });
  } catch (e) {
    console.error("[upload] network error", e);
    throw new Error("网络不稳，请稍后重试");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    const msg =
      res.status === 413 ? "图片太大，换一张小一点的" :
      res.status === 415 ? "这种图片格式不支持，请用 JPG / PNG" :
      res.status >= 500 ? "服务器开小差，请稍后重试" :
      err.error || `上传失败（${res.status}）`;
    console.error("[upload] server reject", res.status, err);
    throw new Error(msg);
  }
  const data = (await res.json()) as { url?: string; pathname?: string };
  if (!data.url || !data.pathname) throw new Error("服务器返回异常");
  return { url: data.url, pathname: data.pathname };
}
