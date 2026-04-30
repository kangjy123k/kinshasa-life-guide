import { NextRequest, NextResponse } from "next/server";
import { moderate } from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const provided = req.headers.get("x-admin-password");
  return provided === expected;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = (await req.json()) as { action?: "approve" | "reject"; reason?: string };
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
    const row = await moderate({ id, action: body.action, reason: body.reason });
    if (!row) {
      return NextResponse.json({ ok: false, error: "not_pending" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, recording: row });
  } catch (e) {
    console.error("admin fwod recording moderate error:", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
