import { NextResponse } from "next/server";
import { getQrcodeMeta } from "@/lib/qrcode";

export const runtime = "edge";

export async function GET() {
  try {
    const meta = await getQrcodeMeta();
    if (!meta) {
      return NextResponse.json(
        {
          ok: true,
          fallback: true,
          imageUrl: "/images/qr/wechat-group.jpg",
          uploadedAt: null,
          version: 0,
        },
        {
          headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
        }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        fallback: false,
        imageUrl: `/api/public/qrcode/image?v=${meta.version}`,
        uploadedAt: meta.uploadedAt,
        version: meta.version,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
      }
    );
  } catch (e) {
    console.error("public qrcode meta error:", e);
    return NextResponse.json({
      ok: true,
      fallback: true,
      imageUrl: "/images/qr/wechat-group.jpg",
      uploadedAt: null,
      version: 0,
    });
  }
}
