import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/lib/media";

export const runtime = "nodejs";

// 读一次写一次，之后 CDN 长缓存 — Vercel edge 会按 Cache-Control 托管，
// Turso 每张图只被读 ≤ 1 次。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await getMedia(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  // 从 Uint8Array 生成一个真正的 ArrayBuffer 作为 body，避免 SharedArrayBuffer 类型问题
  const ab = new ArrayBuffer(row.bytes.byteLength);
  new Uint8Array(ab).set(row.bytes);
  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.size),
      // immutable = 永不重新校验；Vercel CDN 会托管
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
