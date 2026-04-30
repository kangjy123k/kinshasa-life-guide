import { NextRequest, NextResponse } from "next/server";
import { listPending } from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const provided = req.headers.get("x-admin-password");
  return provided === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const items = await listPending();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("admin fwod recording list error:", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
