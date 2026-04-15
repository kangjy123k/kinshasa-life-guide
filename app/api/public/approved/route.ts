import { NextResponse } from "next/server";
import { listSubmissions } from "@/lib/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await listSubmissions();
    const approved = all.filter((r) => r.status === "approved");
    return NextResponse.json({ ok: true, records: approved });
  } catch (e: unknown) {
    console.error("public approved error:", e);
    return NextResponse.json({ ok: false, records: [] }, { status: 500 });
  }
}
