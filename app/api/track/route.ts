import { NextRequest, NextResponse } from "next/server";
import { recordVisit } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";

    const total = await recordVisit({
      timestamp: new Date().toISOString(),
      ua,
      referer,
      ip,
    });

    return NextResponse.json({ ok: true, total });
  } catch (e: unknown) {
    console.error("track error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
