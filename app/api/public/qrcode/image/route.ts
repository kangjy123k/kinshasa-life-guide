import { NextResponse } from "next/server";
import { getQrcode } from "@/lib/qrcode";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rec = await getQrcode();
    if (!rec) {
      return new NextResponse("no qrcode", { status: 404 });
    }
    const buf = Buffer.from(rec.dataBase64, "base64");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": rec.mime,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.error("qrcode image error:", e);
    return new NextResponse("image error", { status: 500 });
  }
}
