import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/lib/media";

export const runtime = "nodejs";

// 读一次写一次，之后 CDN 长缓存 — Vercel edge 会按 Cache-Control 托管，
// Turso 每张图只被读 ≤ 1 次。
//
// 视频特殊：微信 X5 长按"保存视频"要求服务端支持 Range，并且
// URL 看起来像视频文件（带扩展名）。所以路由参数允许 `<id>.mp4` / `.webm`，
// 服务端只用 id 部分查表，扩展名仅用于客户端识别。
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  // 剥扩展名
  const id = raw.replace(/\.(mp4|webm|jpg|jpeg|png|webp)$/i, "");
  const row = await getMedia(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const isVideo = row.mime.startsWith("video/");
  const total = row.size;
  const rangeHeader = req.headers.get("range");

  // 处理 Range：Safari/X5 拉视频时几乎必走 Range
  if (isVideo && rangeHeader) {
    const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : total - 1;
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end < total &&
        start <= end
      ) {
        const chunk = row.bytes.slice(start, end + 1);
        const ab = new ArrayBuffer(chunk.byteLength);
        new Uint8Array(ab).set(chunk);
        return new NextResponse(ab, {
          status: 206,
          headers: {
            "Content-Type": row.mime,
            "Content-Length": String(chunk.byteLength),
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }
  }

  // 完整响应
  const ab = new ArrayBuffer(row.bytes.byteLength);
  new Uint8Array(ab).set(row.bytes);
  const headers: Record<string, string> = {
    "Content-Type": row.mime,
    "Content-Length": String(total),
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (isVideo) headers["Accept-Ranges"] = "bytes";
  return new NextResponse(ab, { status: 200, headers });
}
