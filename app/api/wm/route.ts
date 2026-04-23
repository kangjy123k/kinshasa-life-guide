import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { getMedia } from "@/lib/media";

export const runtime = "nodejs";

// 只允许代理本项目资源：/api/media/<id>、/images/**、/fwod/**
// 外部任意 URL 一律拒绝，避免流量放大 / SSRF
function parseAllowedSrc(raw: string): { kind: "media" | "public"; value: string } | null {
  const src = raw.trim();
  if (!src) return null;
  if (src.startsWith("/api/media/")) {
    const id = src.slice("/api/media/".length).split("?")[0];
    if (!/^[a-f0-9]{8,48}$/i.test(id)) return null;
    return { kind: "media", value: id };
  }
  if (src.startsWith("/images/") || src.startsWith("/fwod/")) {
    // 禁止 .. 以及 url-encoded 变种
    const lower = src.toLowerCase();
    if (lower.includes("..") || lower.includes("%2e%2e")) return null;
    return { kind: "public", value: src };
  }
  return null;
}

let wmPromise: Promise<Buffer> | null = null;
async function loadWatermark(): Promise<Buffer> {
  if (!wmPromise) {
    wmPromise = fs.readFile(path.join(process.cwd(), "public", "images", "watermark-tile.png"));
  }
  return wmPromise;
}

async function loadPublicImage(relPath: string): Promise<Buffer | null> {
  try {
    const file = path.join(process.cwd(), "public", relPath.replace(/^\//, ""));
    // 再次确认 cwd 根下不被 .. 逃逸
    const resolved = path.resolve(file);
    const root = path.resolve(process.cwd(), "public");
    if (!resolved.startsWith(root)) return null;
    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}

async function loadSource(
  parsed: NonNullable<ReturnType<typeof parseAllowedSrc>>,
): Promise<Buffer | Uint8Array | null> {
  if (parsed.kind === "media") {
    const rec = await getMedia(parsed.value);
    if (!rec) return null;
    return rec.bytes;
  }
  return loadPublicImage(parsed.value);
}

export async function GET(req: NextRequest) {
  const srcRaw = new URL(req.url).searchParams.get("src") ?? "";
  const parsed = parseAllowedSrc(srcRaw);
  if (!parsed) {
    return NextResponse.json({ error: "bad src" }, { status: 400 });
  }
  try {
    const [sourceBuf, wmBuf] = await Promise.all([loadSource(parsed), loadWatermark()]);
    if (!sourceBuf) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const [srcMeta, wmMeta] = await Promise.all([
      sharp(sourceBuf).metadata(),
      sharp(wmBuf).metadata(),
    ]);
    const w = srcMeta.width ?? 1200;
    const h = srcMeta.height ?? 900;
    const tileOrigW = wmMeta.width ?? 488;
    const tileOrigH = wmMeta.height ?? 334;
    // 水印 tile 随源图尺寸缩放：目标每条水印文字横跨约图宽的 1/3，
    // 但必须严格不超过源图宽/高（sharp composite 要求 overlay ≤ base）。
    const ideal = Math.max(260, Math.min(Math.round(w / 3), 700));
    const maxByHeight = Math.floor((h * tileOrigW) / tileOrigH);
    const targetTileW = Math.max(1, Math.min(ideal, w, maxByHeight));
    const tileResized = await sharp(wmBuf)
      .resize({ width: targetTileW, withoutEnlargement: false })
      .png()
      .toBuffer();
    const output = await sharp(sourceBuf)
      .rotate() // 应用 EXIF 方向
      .composite([{ input: tileResized, tile: true, blend: "over" }])
      .webp({ quality: 82 })
      .toBuffer();
    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        // CDN 长缓存；源图换了要换 URL 才会重新生成
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Image-Size": `${w}x${h}`,
      },
    });
  } catch (e) {
    console.error("wm error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
