import { NextRequest, NextResponse } from "next/server";
import { getMyStats } from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownerToken(req: NextRequest): string | null {
  const c = req.cookies.get("klg_owner")?.value;
  if (c && /^[a-f0-9]{16,64}$/i.test(c)) return c;
  const h = req.headers.get("x-owner-token");
  if (h && /^[a-f0-9]{16,64}$/i.test(h)) return h;
  return null;
}

export async function GET(req: NextRequest) {
  const owner = ownerToken(req);
  if (!owner) {
    return NextResponse.json(
      { ok: true, wordCount: 0, exampleCount: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const stats = await getMyStats(owner);
    return NextResponse.json(
      { ok: true, ...stats },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("my-stats error:", e);
    return NextResponse.json(
      { ok: false, wordCount: 0, exampleCount: 0 },
      { status: 500 },
    );
  }
}
