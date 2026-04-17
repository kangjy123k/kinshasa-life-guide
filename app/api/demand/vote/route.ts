import { NextRequest, NextResponse } from "next/server";
import { voteProduct } from "@/lib/demand";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: number; fingerprint?: string };
    const id = Number(body.id);
    const fingerprint = String(body.fingerprint ?? "").slice(0, 128);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, reason: "缺少 id" }, { status: 400 });
    }
    if (!fingerprint) {
      return NextResponse.json({ ok: false, reason: "缺少 fingerprint" }, { status: 400 });
    }
    const result = await voteProduct(id, fingerprint);
    if (!result.ok) {
      return NextResponse.json(result, { status: 200 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("demand vote error:", e);
    return NextResponse.json({ ok: false, reason: "server error" }, { status: 500 });
  }
}
