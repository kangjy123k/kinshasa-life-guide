import { NextResponse } from "next/server";
import { listFwod } from "@/lib/fwod-store";

export const runtime = "edge";

export async function GET() {
  try {
    const entries = await listFwod();
    return NextResponse.json(
      { ok: true, entries },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("fwod list error:", e);
    return NextResponse.json({ ok: false, entries: [] }, { status: 500 });
  }
}
