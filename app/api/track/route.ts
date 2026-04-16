import { NextRequest, NextResponse } from "next/server";
import { recordVisit } from "@/lib/analytics";

export const runtime = "edge";

function pick(req: NextRequest, name: string): string | undefined {
  const v = req.headers.get(name);
  if (!v) return undefined;
  // Vercel 的 city header 是 URL encoded（如 "Lubumbashi" / "Kinshasa"），
  // 偶尔会出现空字符串
  try {
    const decoded = decodeURIComponent(v);
    return decoded.trim() || undefined;
  } catch {
    return v.trim() || undefined;
  }
}

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
      country: pick(req, "x-vercel-ip-country"),
      city: pick(req, "x-vercel-ip-city"),
      region: pick(req, "x-vercel-ip-country-region"),
      latitude: pick(req, "x-vercel-ip-latitude"),
      longitude: pick(req, "x-vercel-ip-longitude"),
    });

    return NextResponse.json({ ok: true, total });
  } catch (e: unknown) {
    console.error("track error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
