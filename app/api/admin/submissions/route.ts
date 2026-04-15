import { NextRequest, NextResponse } from "next/server";
import { listSubmissions } from "@/lib/submissions";

export const runtime = "nodejs";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const provided = req.headers.get("x-admin-password");
  return provided === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const records = await listSubmissions();
  return NextResponse.json({ ok: true, records });
}
