import { NextRequest, NextResponse } from "next/server";
import { saveMedia } from "@/lib/media";

export const runtime = "nodejs";

// 客户端已压缩，这里兜底；再大的坚决拒收
const MAX_BYTES_IMAGE = 1_500_000;
const MAX_BYTES_VIDEO = 8_000_000; // 720x1280, 6s, ≤ 2.5Mbps 实测 ~3MB，留 buffer
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);
function isAllowed(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mime) || ALLOWED_VIDEO_MIME.has(mime);
}
function maxFor(mime: string): number {
  return ALLOWED_VIDEO_MIME.has(mime) ? MAX_BYTES_VIDEO : MAX_BYTES_IMAGE;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const scope = (form.get("scope") as string | null) || "merchant";
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing file" }, { status: 400 });
    }
    // 某些浏览器（含 X5）File.type 可能带 codecs；只取主类型
    const mime = (file.type || "").split(";")[0].trim();
    if (!isAllowed(mime)) {
      return NextResponse.json(
        { ok: false, error: `unsupported type: ${mime}` },
        { status: 415 },
      );
    }
    const max = maxFor(mime);
    if (file.size > max) {
      return NextResponse.json(
        {
          ok: false,
          error: `file too large (${Math.round(file.size / 1024)} KB, max ${Math.round(max / 1024)} KB)`,
        },
        { status: 413 },
      );
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    const { id } = await saveMedia({ bytes: buf, mime, scope });
    const url = `/api/media/${id}`;
    return NextResponse.json({ ok: true, url, pathname: url });
  } catch (e: unknown) {
    console.error("upload error:", e);
    return NextResponse.json({ ok: false, error: "upload failed" }, { status: 500 });
  }
}
